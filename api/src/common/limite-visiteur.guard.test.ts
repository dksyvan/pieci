import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LimiteVisiteurGuard } from './limite-visiteur.guard';

const MINUTE = 60_000;

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
    for (let i = 0; i < 3; i++) expect(garde.canActivate(contexte(limite, 'v1'))).toBe(true);

    const erreur = (() => {
      try {
        garde.canActivate(contexte(limite, 'v1'));
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
    expect(garde.canActivate(contexte(alertes, 'v1'))).toBe(true);
    expect(garde.canActivate(contexte(alertes, 'v2'))).toBe(true);
    expect(garde.canActivate(contexte(defi, 'v1'))).toBe(true);
  });

  /**
   * Le défaut de @nestjs/throttler 6.5.0 qui a motivé ce garde : le
   * déblocage d'un visiteur figeait les compteurs des autres.
   */
  it('libère un visiteur à la fin de sa fenêtre sans toucher aux autres', () => {
    const limite = { nom: 'alertes', plafond: 1, dureeMs: 10 * MINUTE };
    garde.canActivate(contexte(limite, 'bloque'));
    expect(() => garde.canActivate(contexte(limite, 'bloque'))).toThrow(HttpException);

    vi.advanceTimersByTime(5 * MINUTE);
    garde.canActivate(contexte(limite, 'autre'));

    vi.advanceTimersByTime(6 * MINUTE);
    expect(garde.canActivate(contexte(limite, 'bloque'))).toBe(true);

    vi.advanceTimersByTime(5 * MINUTE);
    expect(garde.canActivate(contexte(limite, 'autre'))).toBe(true);
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
