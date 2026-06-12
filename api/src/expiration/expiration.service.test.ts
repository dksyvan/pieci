import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Repository, UpdateResult } from 'typeorm';
import { PieceTrouvee } from '../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../alertes-perte/entities/alerte-perte.entity';
import { StatutAlerte, StatutTrouvaille } from '../common/enums';
import { ExpirationService } from './expiration.service';

function creerRepoMock(affected?: number) {
  const update = vi.fn(async () => ({ affected, raw: [], generatedMaps: [] }) as UpdateResult);
  return { update } as unknown as Repository<any>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExpirationService.expirerAnnonces', () => {
  it('bascule au statut "expiree" les pièces trouvées disponibles et les alertes actives dont la date est dépassée', async () => {
    const piecesTrouvees = creerRepoMock(2);
    const alertesPerte = creerRepoMock(3);
    const service = new ExpirationService(piecesTrouvees, alertesPerte);

    await service.expirerAnnonces();

    expect(piecesTrouvees.update).toHaveBeenCalledTimes(1);
    const [whereTrouvees, setTrouvees] = (piecesTrouvees.update as any).mock.calls[0];
    expect(Object.keys(whereTrouvees).sort()).toEqual(['dateExpiration', 'statut']);
    expect(whereTrouvees.statut).toBe(StatutTrouvaille.DISPONIBLE);
    expect(whereTrouvees.dateExpiration.type).toBe('lessThanOrEqual');
    expect(whereTrouvees.dateExpiration.value).toBeInstanceOf(Date);
    expect(Math.abs(whereTrouvees.dateExpiration.value.getTime() - Date.now())).toBeLessThan(5000);
    expect(setTrouvees).toEqual({ statut: StatutTrouvaille.EXPIREE });

    expect(alertesPerte.update).toHaveBeenCalledTimes(1);
    const [whereAlertes, setAlertes] = (alertesPerte.update as any).mock.calls[0];
    expect(Object.keys(whereAlertes).sort()).toEqual(['dateExpiration', 'statut']);
    expect(whereAlertes.statut).toBe(StatutAlerte.ACTIVE);
    expect(whereAlertes.dateExpiration.type).toBe('lessThanOrEqual');
    expect(whereAlertes.dateExpiration.value).toBeInstanceOf(Date);
    expect(setAlertes).toEqual({ statut: StatutAlerte.EXPIREE });
  });

  it('journalise un résumé quand au moins une annonce est expirée', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const service = new ExpirationService(creerRepoMock(2), creerRepoMock(0));
    await service.expirerAnnonces();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('2');
  });

  it("ne journalise rien quand aucune annonce n'est expirée", async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const service = new ExpirationService(creerRepoMock(0), creerRepoMock(undefined));
    await service.expirerAnnonces();

    expect(logSpy).not.toHaveBeenCalled();
  });
});
