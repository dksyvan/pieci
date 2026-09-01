import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { COMMUNES, type LatLng } from '@partage/communes';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from '@partage/telephone';
import { LieuField } from '../components/LieuField';
import { IconeFleche, IconeValide } from '../components/Icones';
import { useApp } from '../context/useApp';
import { ApiError, creerPieceTrouvee } from '../lib/api';

const AUTRE_DEPOT = '__autre__';

/** Ce qui ne change pas d'une pièce à l'autre quand on vide un tiroir. */
interface Constantes {
  monPrenom: string;
  monNom: string;
  monTelephone: string;
  lieu: string;
  commune: string;
  coords: LatLng | null;
  pointDepotId: string;
  depotAutre: string;
}

type EtatEntree = 'attente' | 'envoyee' | 'echec';

/** Une pièce du tiroir : ce qui change, et où elle en est de son envoi. */
interface Entree {
  cle: string;
  typePiece: TypePiece;
  prenom: string;
  nom: string;
  etat: EtatEntree;
  message?: string;
}

interface Dossier {
  constantes: Constantes;
  entrees: Entree[];
}

const VIDE: Dossier = {
  constantes: {
    monPrenom: '',
    monNom: '',
    monTelephone: '',
    lieu: '',
    commune: '',
    coords: null,
    pointDepotId: '',
    depotAutre: '',
  },
  entrees: [],
};

/**
 * Le travail d'un après-midi tient dans cette clé.
 *
 * Une saisie de trente pièces dure une heure, et rien ne part avant la fin :
 * un onglet fermé par mégarde effacerait tout. Ce qui est ecrit est donc
 * relu au retour.
 */
const CLE_STOCKAGE = 'pieci.saisie.v1';

function lireDossier(): Dossier | null {
  if (typeof window === 'undefined') return null;
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return null;
    const dossier = JSON.parse(brut) as Dossier;
    return Array.isArray(dossier?.entrees) && dossier.constantes ? dossier : null;
  } catch {
    // Stockage refusé (navigation privée) ou contenu abîmé : on repart à vide
    // plutôt que d'empêcher la page de s'ouvrir.
    return null;
  }
}

/**
 * Un dossier auquel personne n'a encore touché.
 *
 * Sert de garde à la sauvegarde : c'est l'état exact du premier rendu, celui
 * qui ne doit jamais partir par-dessus le travail enregistré.
 */
function estVierge(dossier: Dossier): boolean {
  return (
    dossier.entrees.length === 0 &&
    Object.values(dossier.constantes).every((valeur) => !valeur)
  );
}

/**
 * Saisie en série, pour un tiroir de pièces.
 *
 * Une mairie, un commissariat ou une pharmacie de quartier gardent des
 * dizaines de pièces qui dorment. Les déclarer une par une par le formulaire
 * ordinaire redemanderait l'identité du déclarant, le lieu et le point de
 * dépôt à chaque fois — quatre-vingt-dix champs inutiles pour trente pièces,
 * et personne ne va au bout.
 *
 * Ici, ce qui ne change pas se renseigne une fois. Ne reste que ce qui change
 * vraiment : le type de document, le prénom, le nom. Le type reste d'ailleurs
 * d'une pièce à l'autre — un tiroir, c'est surtout des CNI.
 *
 * Rien ne part avant que le tiroir soit fini. Ce n'est pas de la prudence
 * mal placée : l'API ne sait pas supprimer une pièce trouvée, donc une faute
 * de frappe envoyée serait définitive. Tant que la liste est locale, elle se
 * corrige librement.
 *
 * Pas de photo ici, volontairement. Photographier trente cartes annule le
 * gain de temps qui est la raison d'être de cette page, et une image ne
 * survivrait pas au rechargement qui protège le reste. Une pièce qui mérite
 * sa photo mérite le formulaire ordinaire.
 *
 * La page n'est pas dans la navigation : c'est un outil qu'on confie à un
 * partenaire, pas une porte d'entrée du site.
 */
export function Saisie() {
  const { pointsDepot, recharger, afficherToast } = useApp();

  const [dossier, setDossier] = useState<Dossier>(VIDE);
  const [brouillon, setBrouillon] = useState<{ typePiece: TypePiece | ''; prenom: string; nom: string }>({
    typePiece: '',
    prenom: '',
    nom: '',
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<'repos' | 'encours' | 'fini'>('repos');
  const champPrenom = useRef<HTMLInputElement>(null);

  const { constantes, entrees } = dossier;

  useEffect(() => {
    const repris = lireDossier();
    if (!repris) return;
    /*
     * Reprise du travail interrompu. La règle voudrait que cette lecture se
     * fasse pendant le rendu ; ce serait pire, comme sur la fiche d'une pièce :
     * le HTML servi est le formulaire vide, et rendre la liste dès le premier
     * passage ferait diverger l'hydratation. Un rendu de plus coûte moins
     * qu'un rendu client entier.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDossier(repris);
  }, []);

  /**
   * Écriture à chaque changement : c'est le seul filet entre la saisie et
   * l'envoi. Les états d'envoi ne sont pas conservés — au retour, tout ce qui
   * n'est pas parti est en attente.
   *
   * Un dossier vierge n'est jamais écrit, et c'est ce qui rend la reprise
   * possible. Au montage, cet effet part avant que l'état repris ne soit
   * arrivé : sans ce garde, il écrasait la sauvegarde par du vide. Un simple
   * « pas au tout premier passage » ne suffirait pas — LieuField synchronise
   * la commune dès son montage, ce qui déclenche une écriture de plus, et en
   * développement React monte les effets deux fois.
   *
   * Le critère porte donc sur la donnée et non sur le moment : on n'écrit que
   * ce qui vaut la peine d'être relu.
   */
  useEffect(() => {
    if (estVierge(dossier) || typeof window === 'undefined') return;
    try {
      const aGarder: Dossier = {
        constantes: dossier.constantes,
        entrees: dossier.entrees
          .filter((e) => e.etat !== 'envoyee')
          .map((e) => ({ ...e, etat: 'attente' as const, message: undefined })),
      };
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(aGarder));
    } catch {
      // Stockage plein ou refusé : la saisie continue, sans filet.
    }
  }, [dossier]);

  const majConstantes = (partiel: Partial<Constantes>) =>
    setDossier((d) => ({ ...d, constantes: { ...d.constantes, ...partiel } }));

  const ajouter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!brouillon.typePiece) return setErreur('Choisis le type de document.');
    if (!brouillon.prenom.trim()) return setErreur('Écris le prénom inscrit sur la pièce.');
    if (!brouillon.nom.trim()) return setErreur('Écris le nom inscrit sur la pièce.');

    setErreur(null);
    setDossier((d) => ({
      ...d,
      entrees: [
        ...d.entrees,
        {
          cle: `${Date.now()}-${d.entrees.length}`,
          typePiece: brouillon.typePiece as TypePiece,
          prenom: brouillon.prenom.trim(),
          nom: brouillon.nom.trim(),
          etat: 'attente',
        },
      ],
    }));

    // Le type reste : un tiroir, c'est surtout des CNI à la suite.
    setBrouillon((b) => ({ ...b, prenom: '', nom: '' }));
    champPrenom.current?.focus();
  };

  const retirer = (cle: string) =>
    setDossier((d) => ({ ...d, entrees: d.entrees.filter((e) => e.cle !== cle) }));

  const marquer = (cle: string, etat: EtatEntree, message?: string) =>
    setDossier((d) => ({
      ...d,
      entrees: d.entrees.map((e) => (e.cle === cle ? { ...e, etat, message } : e)),
    }));

  const aEnvoyer = entrees.filter((e) => e.etat !== 'envoyee');
  const envoyees = entrees.filter((e) => e.etat === 'envoyee').length;
  const echecs = entrees.filter((e) => e.etat === 'echec').length;

  const envoyer = async () => {
    if (envoi === 'encours') return;

    const c = constantes;
    if (!c.monPrenom.trim() || !c.monNom.trim()) return setErreur('Renseigne ton prénom et ton nom.');
    if (!telephoneValide(c.monTelephone)) return setErreur(MESSAGE_TELEPHONE);
    if (!c.lieu.trim() || !c.commune) {
      return setErreur('Indique où ces pièces ont été trouvées — la commune suffit.');
    }
    if (aEnvoyer.length === 0) return setErreur('La liste est vide.');

    setErreur(null);
    setEnvoi('encours');

    const [lat, lng] = c.coords ?? COMMUNES[c.commune];
    const declarant = {
      telephone: normaliserTelephone(c.monTelephone),
      prenom: c.monPrenom.trim(),
      nom: c.monNom.trim(),
    };

    // Une par une, et non toutes ensemble : chaque déclaration déclenche un
    // rapprochement côté serveur, et l'API tourne sur une offre modeste. Trente
    // requêtes simultanées la mettraient à genoux au moment précis où l'on tient
    // enfin un partenaire.
    let reussies = 0;
    for (const entree of aEnvoyer) {
      try {
        await creerPieceTrouvee({
          declarant,
          typePiece: entree.typePiece,
          prenom: entree.prenom,
          nom: entree.nom,
          commune: c.commune,
          quartier: c.lieu.trim() || undefined,
          lat,
          lng,
          pointDepotId: c.pointDepotId && c.pointDepotId !== AUTRE_DEPOT ? c.pointDepotId : undefined,
          pointDepotAutre:
            c.pointDepotId === AUTRE_DEPOT && c.depotAutre.trim() ? c.depotAutre.trim() : undefined,
        });
        reussies += 1;
        marquer(entree.cle, 'envoyee');
      } catch (err) {
        marquer(entree.cle, 'echec', err instanceof ApiError ? err.message : 'Envoi impossible.');
      }
    }

    setEnvoi('fini');
    recharger();
    // Un « c'est enregistré » après deux échecs est un mensonge poli, et la
    // personne repartirait en croyant son tiroir au registre.
    afficherToast(
      reussies === 0
        ? 'Rien n’a pu être enregistré. Vérifie la connexion et relance.'
        : `${reussies} pièce${reussies > 1 ? 's' : ''} au registre. Anitché pour ces gens-là !`,
    );
  };

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Saisie en série</span>
        <h2 style={{ marginTop: 6 }}>Vider un tiroir de pièces</h2>
        <p>
          Pour une mairie, un commissariat, une pharmacie — partout où des pièces s’entassent en
          attendant quelqu’un. Renseigne une fois ce qui ne change pas, puis enchaîne les pièces.
          Rien n’est envoyé avant que tu l’aies décidé.
        </p>
      </div>

      <div className="dossier">
        <div>
          <div className="panneau">
            <div className="panneau-tete">
              <span className="label">Une seule fois</span>
              <span className="cote">Pour tout le tiroir</span>
            </div>

            <div className="duo">
              <div className="champ">
                <label htmlFor="mon-prenom">Ton prénom</label>
                <input
                  id="mon-prenom"
                  value={constantes.monPrenom}
                  onChange={(e) => majConstantes({ monPrenom: e.target.value })}
                  placeholder="Awa"
                />
              </div>
              <div className="champ">
                <label htmlFor="mon-nom">Ton nom</label>
                <input
                  id="mon-nom"
                  value={constantes.monNom}
                  onChange={(e) => majConstantes({ monNom: e.target.value })}
                  placeholder="Koné"
                />
              </div>
            </div>

            <div className="champ">
              <label htmlFor="mon-tel">Ton numéro</label>
              <input
                id="mon-tel"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={constantes.monTelephone}
                onChange={(e) => majConstantes({ monTelephone: e.target.value })}
                placeholder="07 00 00 00 00"
              />
              <p className="aide">
                Jamais publié. C’est par là que les propriétaires seront mis en relation avec vous,
                une fois la correspondance confirmée des deux côtés.
              </p>
            </div>

            <LieuField
              label="Où ces pièces ont-elles été trouvées ?"
              aide="Si tu ne sais pas d’où elles viennent, mets la commune — c’est déjà ce qu’il faut pour que le propriétaire les voie. Une pièce dont tu connais l’endroit exact mérite le formulaire ordinaire."
              lieu={constantes.lieu}
              setLieu={(lieu) => majConstantes({ lieu })}
              commune={constantes.commune}
              setCommune={(commune) => majConstantes({ commune })}
              setCoords={(coords) => majConstantes({ coords })}
            />

            <div className="champ">
              <label htmlFor="depot">Où sont-elles gardées&nbsp;?</label>
              <select
                id="depot"
                value={constantes.pointDepotId}
                onChange={(e) =>
                  majConstantes({
                    pointDepotId: e.target.value,
                    depotAutre: e.target.value === AUTRE_DEPOT ? constantes.depotAutre : '',
                  })
                }
              >
                <option value="">Chez nous — à convenir avec le propriétaire</option>
                {pointsDepot.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom} ({d.commune})
                  </option>
                ))}
                <option value={AUTRE_DEPOT}>Autre lieu — préciser</option>
              </select>
              {constantes.pointDepotId === AUTRE_DEPOT && (
                <input
                  style={{ marginTop: 8 }}
                  value={constantes.depotAutre}
                  onChange={(e) => majConstantes({ depotAutre: e.target.value })}
                  placeholder="Mairie de Yopougon, bureau d’accueil"
                />
              )}
            </div>
          </div>

          <form className="panneau" onSubmit={ajouter} noValidate style={{ marginTop: 'var(--s-4)' }}>
            <div className="panneau-tete">
              <span className="label">Pièce par pièce</span>
              <span className="cote">{entrees.length} au tiroir</span>
            </div>

            <div className="champ">
              <label htmlFor="type">Type de document</label>
              <select
                id="type"
                value={brouillon.typePiece}
                onChange={(e) =>
                  setBrouillon((b) => ({ ...b, typePiece: e.target.value as TypePiece | '' }))
                }
              >
                <option value="">— Choisir —</option>
                {TYPES_PIECE.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="duo">
              <div className="champ">
                <label htmlFor="prenom">Prénom sur la pièce</label>
                <input
                  id="prenom"
                  ref={champPrenom}
                  value={brouillon.prenom}
                  onChange={(e) => setBrouillon((b) => ({ ...b, prenom: e.target.value }))}
                  placeholder="Adjoua"
                />
              </div>
              <div className="champ">
                <label htmlFor="nom">Nom sur la pièce</label>
                <input
                  id="nom"
                  value={brouillon.nom}
                  onChange={(e) => setBrouillon((b) => ({ ...b, nom: e.target.value }))}
                  placeholder="N’Guessan"
                />
              </div>
            </div>

            <p className="aide" style={{ marginTop: -8, marginBottom: 'var(--s-3)' }}>
              Écris comme c’est marqué sur la carte. L’algorithme tolère les variantes — pas la peine
              de fatiguer sur l’orthographe.
            </p>

            <button className="btn btn-plein btn-large" disabled={envoi === 'encours'}>
              Ajouter au tiroir
            </button>
          </form>
        </div>

        <div>
          <div className="panneau">
            <div className="panneau-tete">
              <span className="label">Le tiroir</span>
              <span className="cote">
                {envoyees > 0 ? `${envoyees} enregistrée${envoyees > 1 ? 's' : ''}` : 'Rien envoyé'}
              </span>
            </div>

            {entrees.length === 0 ? (
              <p style={{ color: 'var(--color-sourdine)', lineHeight: 'var(--lh-lead)' }}>
                Le tiroir est vide. Ajoute les pièces une à une à gauche&nbsp;; elles s’empilent ici,
                et tu peux encore les corriger tant que rien n’est parti.
              </p>
            ) : (
              <ol className="liste-saisie">
                {entrees.map((entree, rang) => (
                  <li key={entree.cle} data-etat={entree.etat}>
                    <span className="saisie-rang">{String(rang + 1).padStart(2, '0')}</span>
                    <span className="saisie-nom">
                      {entree.prenom} {entree.nom}
                      <span className="saisie-type">{entree.typePiece}</span>
                      {entree.message && <span className="saisie-echec">{entree.message}</span>}
                    </span>
                    {entree.etat === 'envoyee' ? (
                      <IconeValide taille={15} />
                    ) : (
                      <button
                        type="button"
                        className="lien"
                        onClick={() => retirer(entree.cle)}
                        disabled={envoi === 'encours'}
                        aria-label={`Retirer ${entree.prenom} ${entree.nom} du tiroir`}
                      >
                        Retirer
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {erreur && (
              <p className="erreur" role="alert" style={{ marginTop: 'var(--s-3)' }}>
                {erreur}
              </p>
            )}

            {aEnvoyer.length > 0 && (
              <button
                type="button"
                className="btn btn-plein btn-large"
                style={{ marginTop: 'var(--s-4)' }}
                onClick={() => void envoyer()}
                disabled={envoi === 'encours'}
              >
                {envoi === 'encours'
                  ? `Envoi… ${envoyees} sur ${entrees.length}`
                  : `Enregistrer ${aEnvoyer.length} pièce${aEnvoyer.length > 1 ? 's' : ''}`}
              </button>
            )}

            {envoi === 'fini' && echecs === 0 && aEnvoyer.length === 0 && (
              <p style={{ marginTop: 'var(--s-4)' }}>
                <Link to="/trouvees" className="lien">
                  Voir le registre
                  <IconeFleche taille={15} />
                </Link>
              </p>
            )}

            {echecs > 0 && envoi !== 'encours' && (
              <p className="aide" style={{ marginTop: 'var(--s-3)' }}>
                {echecs} pièce{echecs > 1 ? 's' : ''} n’{echecs > 1 ? 'ont' : 'a'} pas pu être
                enregistrée{echecs > 1 ? 's' : ''}. Elles sont restées dans le tiroir&nbsp;: relance
                l’enregistrement. Celles qui sont déjà passées ne repartiront pas.
              </p>
            )}
          </div>

          <p className="aide" style={{ marginTop: 'var(--s-4)' }}>
            Une pièce enregistrée ne peut plus être retirée du registre depuis cette page. Vérifie
            les noms avant d’envoyer — c’est le seul moment où la liste se corrige.
          </p>
        </div>
      </div>
    </section>
  );
}
