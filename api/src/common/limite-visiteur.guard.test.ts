import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LimiteVisiteurGuard } from './limite-visiteur.guard';

const MINUTE = 60_000;
const EMPREINTE_1 = 'a1'.repeat(12);
const EMPREINTE_2 = 'b2'.repeat(12);

function contexte(limite: object, visiteur?: string, ip = '10.0.0.1'): ExecutionContext {
  const requete = { headers: visiteur ? { 'x-pieci-visiteur': visiteur } : {}, ip };
  const handler = () => undefined;
  Reflect.defineMetadata('pieci:limite-visiteur', limite, handler);
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => requete }),
  } as unknown as ExecutionContext;
}

describe('LimiteVisiteurGuard', () => {
  const garde = new LimiteVisiteurGuard(new Reflector());

  beforeEach(() => {
    LimiteVisiteurGuard.vider();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('laisse passer jusqu’au plafond, puis répond 429', () => {
    const limite = { nom: 'alertes', plafond: 3, dureeMs: 10 * MINUTE };
    for (let i = 0; i < 3; i++) expect(garde.canActivate(contexte(limite, EMPREINTE_1))).toBe(true);

    const erreur = (() => {
      try {
        garde.canActivate(contexte(limite, EMPREINTE_1));
      } catch (e) {
        return e;
      }
    })();
    expect(erreur).toBeInstanceOf(HttpException);
    expect((erreur as HttpException).getStatus()).toBe(429);
  });

  it('compte chaque visiteur et chaque route à part', () => {
    const alertes = { nom: 'alertes', plafond: 1, dureeMs: 10 * MINUTE };
    const defi = { nom: 'defi', plafond: 1, dureeMs: 10 * MINUTE };
    expect(garde.canActivate(contexte(alertes, EMPREINTE_1))).toBe(true);
    expect(garde.canActivate(contexte(alertes, EMPREINTE_2))).toBe(true);
    expect(garde.canActivate(contexte(defi, EMPREINTE_1))).toBe(true);
  });

  /**
   * Un en-tête inventé ne crée pas de compteur : il retombe sur l'adresse.
   * Sans cela, chaque valeur nouvelle ouvrait un compteur neuf.
   */
  it('ignore une empreinte qui n’a pas la forme posée par le Worker', () => {
    const limite = { nom: 'alertes', plafond: 1, dureeMs: 10 * MINUTE };
    garde.canActivate(contexte(limite, 'nimporte-quoi-1', '10.0.0.9'));
    expect(() => garde.canActivate(contexte(limite, 'nimporte-quoi-2', '10.0.0.9'))).toThrow(HttpException);
    expect(() => garde.canActivate(contexte(limite, 'x'.repeat(8000), '10.0.0.9'))).toThrow(HttpException);
  });

  it('borne la mémoire sous un flot d’empreintes valides', () => {
    const limite = { nom: 'alertes', plafond: 5, dureeMs: 10 * MINUTE };
    const debut = performance.now();
    for (let i = 0; i < 12_000; i++) {
      garde.canActivate(contexte(limite, i.toString(16).padStart(24, '0')));
    }
    expect(LimiteVisiteurGuard.taille()).toBeLessThanOrEqual(10_000);
    expect(performance.now() - debut).toBeLessThan(5000);
  });

  /**
   * Le défaut de @nestjs/throttler 6.5.0 qui a motivé ce garde : le
   * déblocage d'un visiteur figeait les compteurs des autres.
   */
  it('libère un visiteur à la fin de sa fenêtre sans toucher aux autres', () => {
    const limite = { nom: 'alertes', plafond: 1, dureeMs: 10 * MINUTE };
    garde.canActivate(contexte(limite, EMPREINTE_1));
    expect(() => garde.canActivate(contexte(limite, EMPREINTE_1))).toThrow(HttpException);

    vi.advanceTimersByTime(5 * MINUTE);
    garde.canActivate(contexte(limite, EMPREINTE_2));

    vi.advanceTimersByTime(6 * MINUTE);
    expect(garde.canActivate(contexte(limite, EMPREINTE_1))).toBe(true);

    vi.advanceTimersByTime(5 * MINUTE);
    expect(garde.canActivate(contexte(limite, EMPREINTE_2))).toBe(true);
  });

  it('retombe sur l’adresse vue par le serveur quand aucune empreinte n’est transmise', () => {
    const limite = { nom: 'alertes', plafond: 1, dureeMs: 10 * MINUTE };
    garde.canActivate(contexte(limite, undefined, '10.0.0.7'));
    expect(() => garde.canActivate(contexte(limite, undefined, '10.0.0.7'))).toThrow(HttpException);
    expect(garde.canActivate(contexte(limite, undefined, '10.0.0.8'))).toBe(true);
  });

  it('ne limite pas une route sans plafond déclaré', () => {
    const handler = () => undefined;
    const ctx = {
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as unknown as ExecutionContext;
    expect(garde.canActivate(ctx)).toBe(true);
  });
});
