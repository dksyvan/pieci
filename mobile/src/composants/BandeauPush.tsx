import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bouton, Erreur, Lien, Panneau, Texte } from './primitives';
import { IconeSuivi, IconeValide } from './Icones';
import { activerNotifications } from '../lib/push';
import { couleurs, espace } from '../design/theme';

interface Props {
  telephone: string;
  onTermine: () => void;
}

type Etat = 'repos' | 'chargement' | 'ok' | 'echec';

/** Proposition d'abonnement aux notifications, après une déclaration. */
export function BandeauPush({ telephone, onTermine }: Props) {
  const [etat, setEtat] = useState<Etat>('repos');
  const [message, setMessage] = useState<string | null>(null);

  const activer = async () => {
    setEtat('chargement');
    const resultat = await activerNotifications(telephone);

    if (resultat.ok) {
      setEtat('ok');
      setTimeout(onTermine, 1800);
      return;
    }
    setMessage(resultat.message);
    setEtat('echec');
  };

  if (etat === 'ok') {
    return (
      <View style={styles.constat}>
        <IconeValide taille={16} couleur={couleurs.officiel} />
        <Texte variante="fine" style={{ color: couleurs.officiel, flex: 1 }}>
          Notifications activées ! Tu seras prévenu dès qu’une correspondance est trouvée pour toi —
          même quand l’appli est fermée.
        </Texte>
      </View>
    );
  }

  return (
    <Panneau style={{ backgroundColor: couleurs.papier2 }}>
      <View style={{ flexDirection: 'row', gap: espace[3] }}>
        <View style={{ paddingTop: 2 }}>
          <IconeSuivi taille={22} couleur={couleurs.cachet} />
        </View>
        <View style={{ flex: 1 }}>
          <Texte variante="sous" style={{ fontSize: 17 }}>
            On te notifie ?
          </Texte>
          <Texte variante="fine" style={{ marginTop: 4 }}>
            Reçois une alerte dès qu’une correspondance est trouvée, même quand l’appli est fermée.
            Sinon il faudra repasser sur l’onglet Suivi de temps en temps.
          </Texte>

          {etat === 'echec' && message && <Erreur>{message}</Erreur>}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace[4], marginTop: espace[3], flexWrap: 'wrap' }}>
            <Bouton
              titre={etat === 'echec' ? 'Réessayer' : 'Oui, me notifier'}
              onPress={() => void activer()}
              enCours={etat === 'chargement'}
            />
            <Lien titre="Non merci" onPress={onTermine} />
          </View>
        </View>
      </View>
    </Panneau>
  );
}

const styles = StyleSheet.create({
  constat: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espace[2],
    borderLeftWidth: 2,
    borderLeftColor: couleurs.officiel,
    paddingLeft: espace[3],
    paddingVertical: espace[3],
  },
});
