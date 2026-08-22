import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';
import type { PushSubscription } from './entities/push-subscription.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';

/** VAPID absent : le Web Push se désactive tout seul, on isole le chemin Expo. */
const configSansVapid = { get: () => undefined } as unknown as ConfigService;

const subsVide = {
  findBy: vi.fn(async () => []),
} as unknown as Repository<PushSubscription>;

function creerJetonsRepo(jetons: ExpoPushToken[]) {
  return {
    findBy: vi.fn(async () => jetons),
    findOne: vi.fn(async ({ where }: { where: { jeton: string } }) =>
      jetons.find((j) => j.jeton === where.jeton) ?? null,
    ),
    create: vi.fn((j: Partial<ExpoPushToken>) => j as ExpoPushToken),
    save: vi.fn(async (j: ExpoPushToken) => j),
    delete: vi.fn(async () => ({ affected: 0 })),
  } as unknown as Repository<ExpoPushToken>;
}

function jeton(id: string, telephone: string, valeur: string): ExpoPushToken {
  return { id, telephone, jeton: valeur, createdAt: new Date() };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PushService.enregistrerJeton', () => {
  it('crée le jeton quand il est inconnu', async () => {
    const repo = creerJetonsRepo([]);
    const service = new PushService(subsVide, repo, configSansVapid);

    await service.enregistrerJeton('0700000001', 'ExponentPushToken[aaa]');

    expect(repo.create).toHaveBeenCalledWith({
      telephone: '0700000001',
      jeton: 'ExponentPushToken[aaa]',
    });
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('réattribue un appareil qui change de numéro au lieu de créer un doublon', async () => {
    const existant = jeton('t-1', '0700000001', 'ExponentPushToken[aaa]');
    const repo = creerJetonsRepo([existant]);
    const service = new PushService(subsVide, repo, configSansVapid);

    await service.enregistrerJeton('0700000002', 'ExponentPushToken[aaa]');

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't-1', telephone: '0700000002' }),
    );
  });

  it("n'écrit rien quand le jeton est déjà rattaché au bon numéro", async () => {
    const repo = creerJetonsRepo([jeton('t-1', '0700000001', 'ExponentPushToken[aaa]')]);
    const service = new PushService(subsVide, repo, configSansVapid);

    await service.enregistrerJeton('0700000001', 'ExponentPushToken[aaa]');

    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('PushService.sendToTelephone — transport Expo', () => {
  it('envoie un message par jeton du numéro', async () => {
    const repo = creerJetonsRepo([
      jeton('t-1', '0700000001', 'ExponentPushToken[aaa]'),
      jeton('t-2', '0700000001', 'ExponentPushToken[bbb]'),
    ]);
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }, { status: 'ok' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new PushService(subsVide, repo, configSansVapid);
    await service.sendToTelephone('0700000001', 'Correspondance', 'Une pièce correspond.');

    expect(fetchMock).toHaveBeenCalledOnce();
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const corps = JSON.parse(String(options?.body)) as Array<Record<string, unknown>>;
    expect(corps).toHaveLength(2);
    expect(corps[0]).toMatchObject({
      to: 'ExponentPushToken[aaa]',
      title: 'Correspondance',
      data: { route: '/suivi' },
    });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('supprime les jetons dont l’appareil s’est désinscrit', async () => {
    const repo = creerJetonsRepo([
      jeton('t-1', '0700000001', 'ExponentPushToken[aaa]'),
      jeton('t-2', '0700000001', 'ExponentPushToken[bbb]'),
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }],
        }),
      })),
    );

    const service = new PushService(subsVide, repo, configSansVapid);
    await service.sendToTelephone('0700000001', 'Titre', 'Corps');

    expect(repo.delete).toHaveBeenCalledWith({ id: expect.objectContaining({ _value: ['t-2'] }) });
  });

  it("n'appelle pas Expo quand le numéro n'a aucun jeton", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const service = new PushService(subsVide, creerJetonsRepo([]), configSansVapid);
    await service.sendToTelephone('0700000009', 'Titre', 'Corps');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ne propage pas une panne réseau — le suivi reste consultable', async () => {
    const repo = creerJetonsRepo([jeton('t-1', '0700000001', 'ExponentPushToken[aaa]')]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );

    const service = new PushService(subsVide, repo, configSansVapid);

    // `false` n'est pas un detail : c'est ce qui declenche le repli SMS.
    await expect(service.sendToTelephone('0700000001', 'Titre', 'Corps')).resolves.toBe(false);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('signale avoir joint quelqu un quand Expo accepte le message', async () => {
    const repo = creerJetonsRepo([jeton('t-1', '0700000001', 'ExponentPushToken[aaa]')]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ data: [{ status: 'ok' }] }) })),
    );

    const service = new PushService(subsVide, repo, configSansVapid);

    await expect(service.sendToTelephone('0700000001', 'Titre', 'Corps')).resolves.toBe(true);
  });

  it('signale n avoir joint personne quand le numero n a aucun appareil', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const service = new PushService(subsVide, creerJetonsRepo([]), configSansVapid);

    await expect(service.sendToTelephone('0700000009', 'Titre', 'Corps')).resolves.toBe(false);
  });
});
