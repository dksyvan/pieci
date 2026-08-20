import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Bouton, Erreur, Filet, Panneau, TetePanneau, Texte } from './primitives';
import { IconeCopier, IconeValide } from './Icones';
import { LIEN_WAVE, MONTANTS, OPERATEURS, formaterMontant, formaterNumero } from '@partage/dons';
import { corps, couleurs, espace, lettrage, polices, rayon } from '../design/theme';

interface Props {
  titre?: string;
  intro?: string;
}

/**
 * Coordonnées de soutien. Aucun paiement ne transite par Pièci : on copie un
 * numéro, ou on ouvre le lien marchand Wave dans le navigateur du système.
 */
export function PanneauDon({ titre = 'Soutenir Pièci', intro }: Props) {
  /* Capturé localement : dans une closure, TypeScript ne conserve pas le
     rétrécissement de type d'une constante de module annotée `string | null`. */
  const lienWave = LIEN_WAVE;
  const [copie, setCopie] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);
  const [montant, setMontant] = useState<number | 'libre' | null>(null);

  useEffect(() => {
    if (!copie) return;
    const minuteur = setTimeout(() => setCopie(null), 2400);
    return () => clearTimeout(minuteur);
  }, [copie]);

  const copier = async (id: string, numero: string) => {
    setEchec(false);
    try {
      await Clipboard.setStringAsync(numero);
      setCopie(id);
    } catch {
      setEchec(true);
    }
  };

  return (
    <Panneau>
      <TetePanneau titre={titre} note="Facultatif" />

      <Texte variante="fine">
        {intro ??
          'Pièci est gratuit et ça le sera toujours. Les dons servent à payer l’hébergement, le nom de domaine et l’envoi des notifications.'}
      </Texte>

      <Texte variante="label" style={{ marginTop: espace[4], marginBottom: 7 }}>
        Montant suggéré
      </Texte>
      <View style={styles.jetons}>
        {MONTANTS.map((m) => {
          const actif = montant === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMontant(actif ? null : m)}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              style={[styles.jeton, actif && styles.jetonActif]}
            >
              <Texte variante="label" style={[styles.jetonTexte, actif && { color: couleurs.papier }]}>
                {formaterMontant(m)}
              </Texte>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setMontant(montant === 'libre' ? null : 'libre')}
          accessibilityRole="button"
          accessibilityState={{ selected: montant === 'libre' }}
          style={[styles.jeton, montant === 'libre' && styles.jetonActif]}
        >
          <Texte
            variante="label"
            style={[styles.jetonTexte, montant === 'libre' && { color: couleurs.papier }]}
          >
            Autre
          </Texte>
        </Pressable>
      </View>

      <Texte variante="fine" style={{ marginTop: espace[2] }}>
        {montant === null
          ? 'Le montant se tape dans ton application, pas ici.'
          : montant === 'libre'
            ? 'Envoie ce que tu peux — même 200 F, ça compte.'
            : `Envoie ${formaterMontant(montant)} au numéro de ton choix ci-dessous.`}
      </Texte>

      {lienWave && (
        <Bouton
          titre="Payer avec Wave"
          variante="cachet"
          pleineLargeur
          onPress={() => void WebBrowser.openBrowserAsync(lienWave)}
          style={{ marginTop: espace[4] }}
        />
      )}

      <View style={{ marginTop: espace[4] }}>
        <Filet fort />
        {OPERATEURS.map((op) => {
          const estCopie = copie === op.id;
          return (
            <View key={op.id} style={styles.ligne}>
              <View style={{ flex: 1 }}>
                <Texte style={styles.operateur}>{op.nom}</Texte>
                <Texte style={styles.numero}>{formaterNumero(op.numero)}</Texte>
                <Texte variante="fine" style={{ marginTop: 2 }}>
                  {op.titulaire}
                  {op.note ? ` · ${op.note}` : ''}
                </Texte>
              </View>
              <Pressable
                onPress={() => void copier(op.id, op.numero)}
                accessibilityRole="button"
                accessibilityLabel={`Copier le numéro ${op.nom}`}
                style={({ pressed }) => [styles.copier, pressed && { opacity: 0.7 }]}
              >
                {estCopie ? (
                  <IconeValide taille={15} couleur={couleurs.officiel} />
                ) : (
                  <IconeCopier taille={15} couleur={couleurs.encre} />
                )}
                <Texte
                  variante="label"
                  style={{ color: estCopie ? couleurs.officiel : couleurs.encre }}
                >
                  {estCopie ? 'Copié' : 'Copier'}
                </Texte>
              </Pressable>
            </View>
          );
        })}
      </View>

      {echec && <Erreur>La copie a échoué. Note le numéro à la main, il est juste au-dessus.</Erreur>}

      <Texte variante="fine" style={{ marginTop: espace[3] }}>
        Aucun paiement ne passe par Pièci : le transfert se fait directement d’une application à
        l’autre. Nous ne voyons ni ton solde, ni ton historique.
      </Texte>
    </Panneau>
  );
}

const styles = StyleSheet.create({
  jetons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jeton: {
    borderWidth: 1,
    borderColor: couleurs.filet2,
    borderRadius: rayon.pastille,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
  },
  jetonActif: { backgroundColor: couleurs.encre, borderColor: couleurs.encre },
  jetonTexte: { letterSpacing: 1 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    paddingVertical: espace[3],
    borderBottomWidth: 1,
    borderBottomColor: couleurs.filet,
  },
  operateur: {
    fontFamily: polices.displayMoyen,
    fontSize: corps.texte,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
  },
  numero: {
    fontFamily: polices.mono,
    fontSize: corps.texte,
    letterSpacing: 0.6,
    color: couleurs.encre,
    marginTop: 3,
  },
  copier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: couleurs.encre,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
});
