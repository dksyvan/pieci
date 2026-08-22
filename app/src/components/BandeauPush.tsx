import { useState } from 'react';
import { enregistrerAbonnementPush, getVapidPublicKey } from '../lib/api';
import { raisonPushIndisponible } from '../lib/plateforme';
import { IconeSuivi, IconeValide } from './Icones';

interface Props {
  telephone: string;
  onTermine: () => void;
}

function base64UrlVersOctets(base64Url: string): Uint8Array {
  const bourrage = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + bourrage).replace(/-/g, '+').replace(/_/g, '/');
  const brut = window.atob(base64);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

type Etat = 'repos' | 'chargement' | 'ok' | 'refuse' | 'erreur';

/** Proposition d'abonnement aux notifications, après une déclaration. */
export function BandeauPush({ telephone, onTermine }: Props) {
  const [etat, setEtat] = useState<Etat>('repos');

  /* Calculé au rendu : sur iPhone en onglet Safari, l'API n'existe pas et
     l'utilisateur mérite de le savoir avant de cliquer pour rien. */
  const indisponible = raisonPushIndisponible();

  const activer = async () => {
    if (indisponible) {
      setEtat('erreur');
      return;
    }

    setEtat('chargement');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setEtat('refuse');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const { key } = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlVersOctets(key).buffer as ArrayBuffer,
      });

      await enregistrerAbonnementPush(telephone, sub.toJSON());
      setEtat('ok');
      setTimeout(onTermine, 1800);
    } catch {
      setEtat('erreur');
    }
  };

  if (etat === 'ok') {
    return (
      <div className="constat" style={{ padding: 'var(--s-3)', alignItems: 'flex-start' }}>
        <IconeValide taille={16} />
        <span>
          <b>Notifications activées&nbsp;!</b> Tu seras prévenu dès qu’une correspondance est trouvée
          pour toi — même quand l’appli est fermée.
        </span>
      </div>
    );
  }

  return (
    <div className="panneau" style={{ background: 'var(--color-papier-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--color-cachet)', flex: 'none', paddingTop: 2 }}>
          <IconeSuivi taille={22} />
        </span>
        <div>
          <b style={{ fontSize: '1.0625rem', letterSpacing: '-0.02em' }}>
            On te notifie&nbsp;?
          </b>
          <p className="aide" style={{ marginTop: 4 }}>
            Reçois une alerte dès qu’une correspondance est trouvée — même quand l’appli est fermée.
            Gratuit, annulable à tout moment. Sinon il faudra repasser sur l’onglet Suivi de temps en
            temps.
          </p>

          {indisponible === 'ios-onglet' && (
            <div className="ios-marche" role="note">
              <b>Sur iPhone, une étape de plus.</b> Apple n’autorise les notifications que pour les
              applications installées. C’est rapide&nbsp;:
              <ol>
                <li>
                  Touche l’icône <b>Partager</b> en bas de Safari — le carré avec une flèche vers le
                  haut
                </li>
                <li>
                  Fais défiler et choisis <b>Sur l’écran d’accueil</b>
                </li>
                <li>Ouvre Pièci depuis l’icône, puis reviens activer les notifications</li>
              </ol>
              En attendant, l’onglet <b>Suivi</b> te montre tes correspondances à tout moment.
            </div>
          )}
          {indisponible === 'navigateur' && (
            <p className="erreur" role="alert">
              Ce navigateur ne gère pas les notifications. Passe par l’onglet Suivi pour consulter
              tes correspondances.
            </p>
          )}
          {!indisponible && etat === 'erreur' && (
            <p className="erreur" role="alert">
              L’activation a échoué. Réessaie, ou passe par l’onglet Suivi.
            </p>
          )}
          {etat === 'refuse' && (
            <p className="erreur" role="alert">
              Permission refusée. Tu peux la réactiver dans les réglages de notifications de ton
              navigateur.
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--s-4)', alignItems: 'center', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
            {!indisponible && (
              <button type="button" className="btn btn-plein" onClick={activer} disabled={etat === 'chargement'}>
                {etat === 'chargement' ? 'Activation…' : 'Oui, me notifier'}
              </button>
            )}
            <button type="button" className="lien" onClick={onTermine}>
              {indisponible ? 'J’ai compris' : 'Non merci'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
