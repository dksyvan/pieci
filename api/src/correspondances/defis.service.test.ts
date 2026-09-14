import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefisService } from './defis.service';

const MINUTE = 60 * 1000;

describe('DefisService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bloque un demandeur après trois réponses fausses, pour trente minutes', () => {
    const defis = new DefisService();
    defis.echec('piece-1', '0700000001');
    defis.echec('piece-1', '0700000001');
    expect(defis.estBloque('piece-1', '0700000001')).toBeNull();

    defis.echec('piece-1', '0700000001');
    expect(defis.estBloque('piece-1', '0700000001')).toBeTruthy();

    vi.advanceTimersByTime(29 * MINUTE);
    expect(defis.estBloque('piece-1', '0700000001')).toBeTruthy();
    vi.advanceTimersByTime(2 * MINUTE);
    expect(defis.estBloque('piece-1', '0700000001')).toBeNull();
  });

  it('ne bloque pas un autre demandeur, ni une autre pièce', () => {
    const defis = new DefisService();
    for (let i = 0; i < 3; i++) defis.echec('piece-1', '0700000001');

    expect(defis.estBloque('piece-1', '0700000002')).toBeNull();
    expect(defis.estBloque('piece-2', '0700000001')).toBeNull();
  });

  /**
   * Aucun code ne vérifie les numéros : dix numéros donneraient trente
   * essais. Le plafond par pièce est la vraie borne.
   */
  it('bloque la pièce entière après dix échecs, tous numéros confondus', () => {
    const defis = new DefisService();
    for (let i = 0; i < 10; i++) defis.echec('piece-1', `07000000${String(i).padStart(2, '0')}`);

    expect(defis.estBloque('piece-1', '0799999999')).toBeTruthy();
    expect(defis.estBloque('piece-2', '0799999999')).toBeNull();
  });

  /**
   * En demi-heures, le plafond par pièce laisserait près de cinq cents essais
   * par jour à qui change de numéro : il se compte en jours.
   */
  it('compte les échecs par pièce sur une journée, et bloque une journée', () => {
    const defis = new DefisService();
    for (let i = 0; i < 9; i++) {
      defis.echec('piece-1', `07000000${String(i).padStart(2, '0')}`);
      vi.advanceTimersByTime(40 * MINUTE);
    }
    expect(defis.estBloque('piece-1', '0799999999')).toBeNull();

    defis.echec('piece-1', '0700000099');
    expect(defis.estBloque('piece-1', '0799999999')).toBeTruthy();

    vi.advanceTimersByTime(23 * 60 * MINUTE);
    expect(defis.estBloque('piece-1', '0799999999')).toBeTruthy();
    vi.advanceTimersByTime(2 * 60 * MINUTE);
    expect(defis.estBloque('piece-1', '0799999999')).toBeNull();
  });

  it('remet le compteur du demandeur à zéro quand il répond juste', () => {
    const defis = new DefisService();
    defis.echec('piece-1', '0700000001');
    defis.echec('piece-1', '0700000001');
    defis.succes('piece-1', '0700000001');
    defis.echec('piece-1', '0700000001');

    expect(defis.estBloque('piece-1', '0700000001')).toBeNull();
  });

  it('oublie des échecs trop anciens pour compter ensemble', () => {
    const defis = new DefisService();
    defis.echec('piece-1', '0700000001');
    defis.echec('piece-1', '0700000001');
    vi.advanceTimersByTime(31 * MINUTE);
    defis.echec('piece-1', '0700000001');

    expect(defis.estBloque('piece-1', '0700000001')).toBeNull();
  });

  /** La cause décide du message : trente minutes ou demain. */
  it('nomme la cause du blocage', () => {
    const defis = new DefisService();
    for (let i = 0; i < 3; i++) defis.echec('piece-1', '0700000001');
    expect(defis.estBloque('piece-1', '0700000001')).toBe('demandeur');

    for (let i = 0; i < 10; i++) defis.echec('piece-2', `07000000${String(i).padStart(2, '0')}`);
    expect(defis.estBloque('piece-2', '0799999999')).toBe('piece');
  });

  it('compte une réponse lourde pour son poids', () => {
    const defis = new DefisService();
    defis.echec('piece-1', '0700000001', 2);
    expect(defis.estBloque('piece-1', '0700000001')).toBeNull();
    defis.echec('piece-1', '0700000001', 2);
    expect(defis.estBloque('piece-1', '0700000001')).toBe('demandeur');
  });
});
