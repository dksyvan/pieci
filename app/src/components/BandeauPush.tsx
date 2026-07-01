import { useState } from 'react';
import { enregistrerAbonnementPush, getVapidPublicKey } from '../lib/api';

interface Props {
  telephone: string;
  onTermine: () => void;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function BandeauPush({ telephone, onTermine }: Props) {
  const [etat, setEtat] = useState<'idle' | 'chargement' | 'ok' | 'refuse' | 'erreur'>('idle');

  const activer = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
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
        applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
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
      <div className="panel" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div className="big">🔔</div>
        <b>Notifications activées !</b>
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          Tu recevras une notification dès qu'une correspondance est trouvée pour toi.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ background: 'var(--color-sand)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <b>Activer les notifications ?</b>
          <p style={{ margin: '4px 0 12px', fontSize: 14 }}>
            Reçois une alerte dès qu'une correspondance est trouvée — même quand l'appli est fermée.
            Gratuit, annulable à tout moment.
          </p>
          {etat === 'erreur' && (
            <p style={{ color: 'var(--color-alert)', fontSize: 13, marginBottom: 10 }}>
              Notifications non disponibles sur ce navigateur. Tu peux toujours vérifier sur l'onglet Suivi.
            </p>
          )}
          {etat === 'refuse' && (
            <p style={{ color: 'var(--color-alert)', fontSize: 13, marginBottom: 10 }}>
              Permission refusée. Tu peux l'activer dans les réglages de ton navigateur.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={activer}
              disabled={etat === 'chargement'}
            >
              {etat === 'chargement' ? 'Activation…' : 'Oui, me notifier'}
            </button>
            <button className="btn" onClick={onTermine}>
              Non merci
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
