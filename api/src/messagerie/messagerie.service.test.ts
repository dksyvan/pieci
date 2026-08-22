import { describe, expect, it, vi } from 'vitest';
import { MessagerieService } from './messagerie.service';
import type { CanalPush } from './canal-push';
import type { CanalSms } from './canal-sms';

function canal(nom: string, payant: boolean, actif: boolean, joint: boolean) {
  return {
    nom,
    payant,
    estActif: () => actif,
    envoyer: vi.fn(async () => joint),
  };
}

/** Le service ne connaît que l'interface : le typage exact n'importe pas ici. */
function creer(push: ReturnType<typeof canal>, sms: ReturnType<typeof canal>) {
  return new MessagerieService(push as unknown as CanalPush, sms as unknown as CanalSms);
}

describe('MessagerieService — repli sur le canal payant', () => {
  it("n'envoie pas de SMS quand le push a joint la personne", async () => {
    const push = canal('push', false, true, true);
    const sms = canal('sms', true, true, true);

    await creer(push, sms).notifier('0700000001', 'Titre', 'Corps');

    expect(push.envoyer).toHaveBeenCalledOnce();
    expect(sms.envoyer).not.toHaveBeenCalled();
  });

  it('envoie un SMS quand le push n a joint personne', async () => {
    const push = canal('push', false, true, false);
    const sms = canal('sms', true, true, true);

    await creer(push, sms).notifier('0700000001', 'Titre', 'Corps');

    expect(push.envoyer).toHaveBeenCalledOnce();
    expect(sms.envoyer).toHaveBeenCalledWith('0700000001', 'Titre', 'Corps');
  });

  it('ne tente rien de payant quand le canal SMS est inactif', async () => {
    const push = canal('push', false, true, false);
    const sms = canal('sms', true, false, true);

    await creer(push, sms).notifier('0700000001', 'Titre', 'Corps');

    expect(sms.envoyer).not.toHaveBeenCalled();
  });

  it('ne propage pas l erreur d un canal — la correspondance reste consultable', async () => {
    const push = canal('push', false, true, false);
    push.envoyer = vi.fn(async () => {
      throw new Error('panne');
    });
    const sms = canal('sms', true, true, true);

    await expect(
      creer(push, sms).notifier('0700000001', 'Titre', 'Corps'),
    ).resolves.toBeUndefined();

    // Le push a echoue : le repli doit quand meme partir.
    expect(sms.envoyer).toHaveBeenCalledOnce();
  });
});