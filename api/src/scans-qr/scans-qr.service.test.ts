import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ScanQr } from './entities/scan-qr.entity';
import { ScansQrService } from './scans-qr.service';
import { sourceConnue, SOURCES } from './sources';
import { ENTETE_JETON, JetonStatsGuard } from './jeton-stats.guard';

describe('sourceConnue', () => {
  it('accepte les supports imprimés, à la casse et aux espaces près', () => {
    for (const source of SOURCES) {
      expect(sourceConnue(source), source).toBe(source);
      expect(sourceConnue(source.toUpperCase()), source).toBe(source);
      expect(sourceConnue(` ${source} `), source).toBe(source);
    }
  });

  /**
   * `s` vient d'une query string publique. Sans liste fermee, il suffirait
   * d'appeler /qr?s=<n'importe quoi> en boucle pour noyer les vrais comptes
   * sous des lignes inventees — et ce sont ces comptes qui decideront du
   * prochain tirage de polos.
   */
  it('range tout le reste sous « inconnu », sans jamais rejeter', () => {
    for (const brut of ['', '   ', 'polos', 'tee-shirt', '<script>', null, undefined, 42, {}]) {
      expect(sourceConnue(brut), JSON.stringify(brut)).toBe('inconnu');
    }
  });
});

describe('ScansQrService.enregistrer', () => {
  function creerService() {
    const insert = vi.fn(async () => ({}) as never);
    const repo = { insert } as unknown as Repository<ScanQr>;
    return { service: new ScansQrService(repo), insert };
  }

  it('normalise la source avant d’écrire', async () => {
    const { service, insert } = creerService();
    await service.enregistrer({ source: 'POLO' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ source: 'polo' }));
  });

  it('écrit « inconnu » plutôt que de perdre un scan réel', async () => {
    // Un QR déjà imprimé sur un vêtement ne se corrige pas.
    const { service, insert } = creerService();
    await service.enregistrer({ source: 'tee-shirt' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ source: 'inconnu' }));
  });

  it('accepte un scan entièrement nu', async () => {
    const { service, insert } = creerService();
    await service.enregistrer({});
    expect(insert).toHaveBeenCalledWith({ source: 'inconnu', userAgent: null, pays: null });
  });

  /**
   * Confidentialite by design, principe non negociable du projet (CLAUDE.md
   * section 2) : compter les scans par support ne demande d'identifier
   * personne. Le champ n'existe plus au DTO, mais un objet peut toujours en
   * porter un — ce test fige le fait qu'il n'atteint jamais la table.
   */
  it('n’écrit aucune adresse, même si on lui en glisse une', async () => {
    const { service, insert } = creerService();
    await service.enregistrer({ source: 'polo', ip: '196.0.0.1' } as never);

    const ecrit = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(ecrit).sort()).toEqual(['pays', 'source', 'userAgent']);
    expect(JSON.stringify(ecrit)).not.toContain('196.0.0.1');
  });

  /**
   * Le sticker WhatsApp arrive par la route /wa, qui fixe elle-meme la source
   * — mais elle traverse le meme chemin que le reste et doit donc etre
   * reconnue, sans quoi ses scans se rangeraient sous « inconnu » et le
   * support paraitrait ne rien rapporter.
   */
  it('reconnait le sticker WhatsApp', async () => {
    const { service, insert } = creerService();
    await service.enregistrer({ source: 'whatsapp' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ source: 'whatsapp' }));
  });

  it('met le pays en capitales', async () => {
    const { service, insert } = creerService();
    await service.enregistrer({ source: 'flyer', pays: 'ci' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ pays: 'CI' }));
  });
});

describe('JetonStatsGuard', () => {
  function creerContexte(entete?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (nom: string) => (nom === ENTETE_JETON ? entete : undefined),
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function creerGarde(jeton?: string) {
    const config = { get: () => jeton } as unknown as ConfigService;
    return new JetonStatsGuard(config);
  }

  /**
   * Ferme par defaut : c'est la facon habituelle dont un endpoint prive se
   * retrouve public — la variable est oubliee au deploiement, et l'ouverture
   * ne se voit pas.
   */
  it('refuse quand aucun jeton n’est configuré', () => {
    expect(creerGarde(undefined).canActivate(creerContexte('peu importe'))).toBe(false);
    expect(creerGarde('').canActivate(creerContexte(''))).toBe(false);
  });

  it('refuse un jeton absent, faux, ou de longueur différente', () => {
    const garde = creerGarde('secret-attendu');
    expect(garde.canActivate(creerContexte(undefined))).toBe(false);
    expect(garde.canActivate(creerContexte('secret-faux--'))).toBe(false);
    expect(garde.canActivate(creerContexte('secret'))).toBe(false);
    expect(garde.canActivate(creerContexte('secret-attendu-plus-long'))).toBe(false);
  });

  it('accepte le jeton exact', () => {
    expect(creerGarde('secret-attendu').canActivate(creerContexte('secret-attendu'))).toBe(true);
  });
});
