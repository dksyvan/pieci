import { useState, type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Bouton, Filet, Lien, Pastille, Texte, Vide } from './primitives';
import { PanneauDon } from './PanneauDon';
import { bandeConfiance } from '@partage/matching';
import { relDate, formaterTelephone } from '@partage/format';
import {
  ApiError,
  confirmerCorrespondance,
  obtenirContact,
  rejeterCorrespondance,
  ReseauError,
  type ContactInfo,
  type Correspondance,
} from '../lib/api';
import { useApp } from '../contexte/AppContext';
import { corps, couleurs, espace, lettrage, polices } from '../design/theme';

interface Props {
  resultats: Correspondance[];
  telephone: string;
  onChange: (maj: Correspondance) => void;
  messageVide?: { titre: string; texte: string };
}

/** `bandeConfiance` renvoie des `var(--…)` côté web ; ici on mappe vers le thème. */
const TEINTES: Record<string, string> = {
  'var(--color-officiel)': couleurs.officiel,
  'var(--color-ambre)': couleurs.ambre,
  'var(--color-sourdine)': couleurs.sourdine,
};

export function ListeCorrespondances({ resultats, telephone, onChange, messageVide }: Props) {
  const { afficherAvis } = useApp();
  const [contacts, setContacts] = useState<Record<string, ContactInfo>>({});
  const [enCours, setEnCours] = useState<string | null>(null);

  const signaler = (err: unknown) =>
    afficherAvis(
      err instanceof ReseauError || err instanceof ApiError
        ? err.message
        : 'Une erreur est survenue, réessaie.',
    );

  const executer = async (
    id: string,
    action: (id: string, telephone: string) => Promise<Correspondance>,
  ) => {
    setEnCours(id);
    try {
      onChange(await action(id, telephone));
    } catch (err) {
      signaler(err);
    } finally {
      setEnCours(null);
    }
  };

  const rechercherContact = async (id: string) => {
    setEnCours(id);
    try {
      const contact = await obtenirContact(id, telephone);
      setContacts((prev) => ({ ...prev, [id]: contact }));
    } catch (err) {
      signaler(err);
    } finally {
      setEnCours(null);
    }
  };

  if (resultats.length === 0) {
    return (
      <Vide
        titre={messageVide?.titre ?? 'Aucune correspondance pour l’instant.'}
        texte={
          messageVide?.texte ??
          'Ton alerte reste active : dès qu’une pièce à ce nom est déclarée, elle apparaît ici.'
        }
      />
    );
  }

  /* Un don n'est proposé qu'après une restitution réellement aboutie. */
  const aRecupere = resultats.some((r) => r.statut === 'confirmee' && contacts[r.id]);

  return (
    <View>
      <View style={styles.entete}>
        <Texte variante="label">Correspondances</Texte>
        <Texte variante="donnee">{String(resultats.length).padStart(2, '0')}</Texte>
      </View>
      <Filet fort />

      {resultats.map((r) => {
        const bande = bandeConfiance(r.score);
        const teinte = TEINTES[bande.couleur] ?? couleurs.sourdine;
        const pct = Math.round(r.score * 100);
        const occupe = enCours === r.id;
        const contact = contacts[r.id];

        let action: ReactNode;

        if (r.statut === 'rejetee') {
          action = <Pastille titre="Écartée" ton="encre" />;
        } else if (r.statut === 'confirmee' && contact) {
          action = (
            <View>
              <Texte style={styles.nom}>
                {contact.prenom} {contact.nom}
              </Texte>
              <Lien
                titre={formaterTelephone(contact.telephone)}
                onPress={() => void Linking.openURL(`tel:${contact.telephone}`)}
                style={{ marginTop: espace[1] }}
              />
            </View>
          );
        } else if (r.statut === 'confirmee') {
          action = (
            <Bouton
              titre="Voir les coordonnées"
              onPress={() => void rechercherContact(r.id)}
              enCours={occupe}
            />
          );
        } else if (r.confirmeParMoi) {
          action = <Pastille titre="En attente de l’autre partie" ton="ambre" />;
        } else {
          action = (
            <View style={{ gap: espace[2] }}>
              <Bouton
                titre="C’est ma pièce"
                onPress={() => void executer(r.id, confirmerCorrespondance)}
                enCours={occupe}
              />
              <Lien
                titre="Pas la mienne"
                onPress={() => void executer(r.id, rejeterCorrespondance)}
                desactive={occupe}
              />
            </View>
          );
        }

        return (
          <View key={r.id} style={styles.corr}>
            <View style={styles.jauge}>
              <Texte style={[styles.pct, { color: teinte }]}>{pct}%</Texte>
              <View style={styles.barre}>
                <View style={[styles.barreRemplie, { width: `${pct}%`, backgroundColor: teinte }]} />
              </View>
              <Texte variante="label" style={{ color: teinte, marginTop: 4 }}>
                {bande.label}
              </Texte>
            </View>

            <View style={{ flex: 1 }}>
              <Texte style={styles.nom}>
                {r.pieceTrouvee.prenom} {r.pieceTrouvee.nom}
              </Texte>
              <Texte variante="donnee" style={{ marginTop: 3, color: couleurs.sourdine }}>
                {r.pieceTrouvee.typePiece.toUpperCase()}
              </Texte>
              <Texte variante="fine" style={{ marginTop: 2 }}>
                {r.pieceTrouvee.commune}
                {r.pieceTrouvee.quartier ? `, ${r.pieceTrouvee.quartier}` : ''} · déclarée{' '}
                {relDate(r.pieceTrouvee.dateTrouvaille)}
              </Texte>
              <View style={{ marginTop: espace[3] }}>{action}</View>
            </View>
          </View>
        );
      })}

      {aRecupere && (
        <View style={{ marginTop: espace[5] }}>
          <PanneauDon
            titre="Ta pièce est retrouvée !"
            intro="Appelle la personne et convenez d’un point de dépôt sûr pour la remise. Si Pièci t’a évité de refaire le document, tu peux participer aux frais — c’est facultatif."
          />
          <Texte variante="fine" style={{ marginTop: espace[2] }}>
            Et n’oublie pas de dire merci à la personne qui a pris le temps de déclarer ta pièce. Le
            bienfait n’est jamais perdu.
          </Texte>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  corr: {
    flexDirection: 'row',
    gap: espace[3],
    paddingVertical: espace[3],
    borderBottomWidth: 1,
    borderBottomColor: couleurs.filet,
  },
  jauge: { width: 64 },
  pct: { fontFamily: polices.monoGras, fontSize: corps.texte + 2, lineHeight: 20 },
  barre: { height: 3, backgroundColor: couleurs.filet, marginTop: 5 },
  barreRemplie: { height: 3 },
  nom: {
    fontFamily: polices.displayMoyen,
    fontSize: corps.texte + 2,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
  },
});
