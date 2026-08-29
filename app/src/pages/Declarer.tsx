import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { COMMUNES, type LatLng } from '@partage/communes';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from '@partage/telephone';
import { GeoField } from '../components/GeoField';
import { BandeauPush } from '../components/BandeauPush';
import { CartePiece } from '../components/CartePiece';
import { IconeValide } from '../components/Icones';
import { useApp } from '../context/useApp';
import { ApiError, uploaderPhotoPiece } from '../lib/api';
import { montrerPremierChamp, type ErreursChamps } from '../lib/formulaire';

const AUTRE_DEPOT = '__autre__';

/** Garanties de confidentialité — l'ordre suit celui du formulaire. */
const GARANTIES = [
  {
    cote: '01',
    texte:
      'En public, on n’affiche que le prénom et l’initiale du nom. Le nom complet, c’est seulement le propriétaire qui le voit, après confirmation.',
  },
  {
    cote: '02',
    texte:
      'La photo est floutée par le serveur : le numéro, la date de naissance et la signature deviennent illisibles. Impossible d’y lire quoi que ce soit.',
  },
  {
    cote: '03',
    texte:
      'Ton numéro n’est jamais publié. Il ne part chez le propriétaire que si vous confirmez tous les deux.',
  },
  {
    cote: '04',
    texte:
      'La remise se fait dans un point de dépôt sûr — mairie, commissariat, pharmacie. Pas de rencontre privée risquée. C’est mieux non ?',
  },
];

export function Declarer() {
  const { pointsDepot, publier, afficherToast } = useApp();
  const navigate = useNavigate();

  const [typePiece, setTypePiece] = useState<TypePiece | ''>('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [pointDepotId, setPointDepotId] = useState('');
  const [depotAutre, setDepotAutre] = useState('');

  const [monPrenom, setMonPrenom] = useState('');
  const [monNom, setMonNom] = useState('');
  const [monTelephone, setMonTelephone] = useState('');

  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const champPhoto = useRef<HTMLInputElement>(null);

  const [enCours, setEnCours] = useState(false);
  /**
   * Numéro sous lequel la déclaration a été enregistrée — sa forme canonique.
   * C'est lui, et pas la saisie brute, que l'abonnement aux notifications doit
   * utiliser : s'abonner sous « 07 00 00 00 00 » quand le compte s'appelle
   * « 0700000000 » enverrait les alertes dans le vide.
   */
  const [publiee, setPubliee] = useState<string | null>(null);

  /**
   * Erreurs de champs, indexées par id du DOM. Le bouton d'envoi reste
   * cliquable en permanence — un bouton grisé ne dit jamais ce qui manque —
   * et c'est l'appui qui déclenche la validation, message par message.
   */
  const [erreurs, setErreurs] = useState<ErreursChamps>({});

  const effacerErreur = (champ: string) =>
    setErreurs((prev) =>
      champ in prev
        ? Object.fromEntries(Object.entries(prev).filter(([cle]) => cle !== champ))
        : prev,
    );

  useEffect(() => {
    if (!apercu) return;
    return () => URL.revokeObjectURL(apercu);
  }, [apercu]);

  const choisirPhoto = (fichier: File | undefined) => {
    if (!fichier || !fichier.type.startsWith('image/')) return;
    setPhoto(fichier);
    setApercu(URL.createObjectURL(fichier));
  };

  const deposer = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    choisirPhoto(e.dataTransfer.files?.[0]);
  };

  const retirerPhoto = () => {
    setPhoto(null);
    setApercu(null);
    if (champPhoto.current) champPhoto.current.value = '';
  };

  const soumettre = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enCours) return;

    // Dans l'ordre du formulaire : le premier manquant est amené à l'écran.
    const manquants: ErreursChamps = {};
    if (!typePiece) manquants.type = 'Choisis le type de pièce trouvée.';
    if (!prenom.trim()) manquants.prenom = 'Écris le prénom inscrit sur la pièce.';
    if (!nom.trim()) manquants.nom = 'Écris le nom inscrit sur la pièce.';
    if (!commune) manquants.commune = 'Choisis la commune où tu l’as trouvée.';
    if (!monPrenom.trim()) manquants.monPrenom = 'Ton prénom, pour te recontacter.';
    if (!monNom.trim()) manquants.monNom = 'Ton nom, pour te recontacter.';
    if (!monTelephone.trim()) manquants.monTel = 'Ton numéro, sinon on ne peut pas te joindre.';
    else if (!telephoneValide(monTelephone)) manquants.monTel = MESSAGE_TELEPHONE;

    setErreurs(manquants);
    if (Object.keys(manquants).length > 0 || !typePiece) {
      montrerPremierChamp(manquants);
      return;
    }
    const [lat, lng] = coords ?? COMMUNES[commune];
    // Forme canonique : le numéro est la clé du compte (voir shared/telephone.ts).
    const numero = normaliserTelephone(monTelephone);

    setEnCours(true);
    try {
      const urls = photo ? await uploaderPhotoPiece(photo) : null;

      await publier({
        declarant: { telephone: numero, prenom: monPrenom, nom: monNom },
        typePiece,
        prenom,
        nom,
        commune,
        quartier: quartier.trim() || undefined,
        lat,
        lng,
        pointDepotId: pointDepotId && pointDepotId !== AUTRE_DEPOT ? pointDepotId : undefined,
        pointDepotAutre: pointDepotId === AUTRE_DEPOT && depotAutre.trim() ? depotAutre.trim() : undefined,
        photoOriginaleUrl: urls?.photoOriginaleUrl,
        photoFlouteeUrl: urls?.photoFlouteeUrl,
      });
      setPubliee(numero);
    } catch (err) {
      afficherToast(err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.');
    } finally {
      setEnCours(false);
    }
  };

  if (publiee !== null) {
    return (
      <section className="section wrap">
        <div className="grille">
          <div className="col-a">
            <span className="timbre">
              <IconeValide taille={14} />
              Entrée enregistrée
            </span>
            <h2 style={{ fontSize: 'var(--t-title)', letterSpacing: '-0.038em', marginTop: 'var(--s-3)', lineHeight: 'var(--lh-title)' }}>
              C’est fait, la pièce de {prenom} {nom.charAt(0).toUpperCase()}. est au registre.
            </h2>
            <p style={{ color: 'var(--color-sourdine)', maxWidth: '52ch', marginTop: 'var(--s-2)', lineHeight: 'var(--lh-lead)' }}>
              Merci pour ton geste. L’algorithme compare déjà avec les alertes en cours — si quelqu’un
              cherche cette pièce, on te le signale, et c’est lui qui te contactera.
            </p>

            <div style={{ marginTop: 'var(--s-5)' }}>
              <BandeauPush telephone={publiee} onTermine={() => navigate('/trouvees')} />
            </div>
          </div>

          <div className="col-b" style={{ alignSelf: 'center' }}>
            <CartePiece
              nom={`${prenom} ${nom.charAt(0).toUpperCase()}.`}
              type={typePiece || 'Pièce d’identité'}
              cachet="DÉCLARÉE"
              inclinaison={1.8}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Déclarer une pièce trouvée</span>
        <h2 style={{ marginTop: 6 }}>J’ai trouvé une pièce hein</h2>
        <p>
          Merci pour ton geste — le bienfait n’est jamais perdu. Renseigne juste le minimum : ce que tu
          écris ici sert uniquement à retrouver le propriétaire, et les données restent protégées.
        </p>
      </div>

      <div className="dossier">
        <form className="panneau" onSubmit={soumettre} noValidate>
          <div className="panneau-tete">
            <span className="label">La pièce</span>
            <span className="cote">Partie 1 / 2</span>
          </div>

          <div className="champ">
            <label htmlFor="type">Type de pièce</label>
            <select
              id="type"
              value={typePiece}
              aria-invalid={erreurs.type ? true : undefined}
              aria-describedby={erreurs.type ? 'type-erreur' : undefined}
              onChange={(e) => {
                setTypePiece(e.target.value as TypePiece | '');
                effacerErreur('type');
              }}
            >
              <option value="">— Choisir —</option>
              {TYPES_PIECE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            {erreurs.type && (
              <p className="erreur" id="type-erreur">
                {erreurs.type}
              </p>
            )}
          </div>

          <div className="duo">
            <div className="champ">
              <label htmlFor="prenom">Prénom (qui est sur la pièce)</label>
              <input
                id="prenom"
                value={prenom}
                aria-invalid={erreurs.prenom ? true : undefined}
                aria-describedby={erreurs.prenom ? 'prenom-erreur' : undefined}
                onChange={(e) => {
                  setPrenom(e.target.value);
                  effacerErreur('prenom');
                }}
                placeholder="Adjoua"
              />
              {erreurs.prenom && (
                <p className="erreur" id="prenom-erreur">
                  {erreurs.prenom}
                </p>
              )}
            </div>
            <div className="champ">
              <label htmlFor="nom">Nom (qui est sur la pièce)</label>
              <input
                id="nom"
                value={nom}
                aria-invalid={erreurs.nom ? true : undefined}
                aria-describedby={erreurs.nom ? 'nom-erreur' : undefined}
                onChange={(e) => {
                  setNom(e.target.value);
                  effacerErreur('nom');
                }}
                placeholder="N’Guessan"
              />
              {erreurs.nom && (
                <p className="erreur" id="nom-erreur">
                  {erreurs.nom}
                </p>
              )}
            </div>
          </div>

          <GeoField
            label="Où as-tu trouvé la pièce ?"
            aide="La commune où tu l’as ramassée — pas celle où tu habites, ni celle marquée sur la pièce."
            commune={commune}
            setCommune={(valeur) => {
              setCommune(valeur);
              effacerErreur('commune');
            }}
            setCoords={setCoords}
            erreur={erreurs.commune}
          />

          <div className="champ">
            <label htmlFor="quartier">Quartier (facultatif)</label>
            <input
              id="quartier"
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              placeholder="Niangon Sud à Gauche"
            />
            <p className="aide">Plus c’est précis, plus vite le propriétaire se repère.</p>
          </div>

          <div className="champ">
            <label htmlFor="depot">Où la pièce se trouve-t-elle maintenant&nbsp;?</label>
            <select
              id="depot"
              value={pointDepotId}
              onChange={(e) => {
                setPointDepotId(e.target.value);
                if (e.target.value !== AUTRE_DEPOT) setDepotAutre('');
              }}
            >
              <option value="">Je la garde — à convenir avec le propriétaire</option>
              {pointsDepot.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom} ({d.commune})
                </option>
              ))}
              <option value={AUTRE_DEPOT}>Autre lieu — préciser</option>
            </select>
            {pointDepotId === AUTRE_DEPOT && (
              <input
                style={{ marginTop: 8 }}
                value={depotAutre}
                onChange={(e) => setDepotAutre(e.target.value)}
                placeholder="Pharmacie du Carrefour, Cocody Angré 8e Tranche"
                aria-label="Préciser le lieu de dépôt"
              />
            )}
          </div>

          <div className="champ">
            <label htmlFor="photo">Photo de la pièce (facultatif)</label>
            <input
              ref={champPhoto}
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) => choisirPhoto(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
            {apercu ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--s-3)',
                  border: '1px solid var(--color-filet-2)',
                  padding: 'var(--s-2)',
                }}
              >
                <img
                  src={apercu}
                  alt="Aperçu avant floutage"
                  style={{ width: 64, height: 44, objectFit: 'cover', border: '1px solid var(--color-filet-2)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 'var(--t-fine)',
                      fontWeight: 600,
                    }}
                  >
                    {photo?.name}
                  </div>
                  <div className="ligne-meta">Le floutage est appliqué à l’envoi.</div>
                </div>
                <button type="button" className="lien" onClick={retirerPhoto}>
                  Retirer
                </button>
              </div>
            ) : (
              <div
                className="depot"
                role="button"
                tabIndex={0}
                onClick={() => champPhoto.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    champPhoto.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={deposer}
              >
                <b style={{ color: 'var(--color-encre)' }}>Mets une photo du recto</b>
                <br />
                Le numéro et les données sensibles seront floutés automatiquement. Personne ne pourra
                rien y lire.
              </div>
            )}
          </div>

          <div className="panneau-tete" style={{ marginTop: 'var(--s-5)' }}>
            <span className="label">Toi</span>
            <span className="cote">Partie 2 / 2</span>
          </div>

          <p className="aide" style={{ marginTop: 0, marginBottom: 'var(--s-3)' }}>
            Pour qu’on puisse te recontacter si on identifie le propriétaire. Ça ne sera jamais
            affiché publiquement.
          </p>

          <div className="duo">
            <div className="champ">
              <label htmlFor="monPrenom">Ton prénom</label>
              <input
                id="monPrenom"
                value={monPrenom}
                aria-invalid={erreurs.monPrenom ? true : undefined}
                aria-describedby={erreurs.monPrenom ? 'monPrenom-erreur' : undefined}
                onChange={(e) => {
                  setMonPrenom(e.target.value);
                  effacerErreur('monPrenom');
                }}
                placeholder="Justine"
              />
              {erreurs.monPrenom && (
                <p className="erreur" id="monPrenom-erreur">
                  {erreurs.monPrenom}
                </p>
              )}
            </div>
            <div className="champ">
              <label htmlFor="monNom">Ton nom</label>
              <input
                id="monNom"
                value={monNom}
                aria-invalid={erreurs.monNom ? true : undefined}
                aria-describedby={erreurs.monNom ? 'monNom-erreur' : undefined}
                onChange={(e) => {
                  setMonNom(e.target.value);
                  effacerErreur('monNom');
                }}
                placeholder="Diby"
              />
              {erreurs.monNom && (
                <p className="erreur" id="monNom-erreur">
                  {erreurs.monNom}
                </p>
              )}
            </div>
          </div>

          <div className="champ">
            <label htmlFor="monTel">Ton numéro de téléphone</label>
            <input
              id="monTel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={monTelephone}
              aria-invalid={erreurs.monTel ? true : undefined}
              aria-describedby={erreurs.monTel ? 'monTel-erreur' : undefined}
              onChange={(e) => {
                setMonTelephone(e.target.value);
                effacerErreur('monTel');
              }}
              placeholder="07 00 00 00 00"
            />
            {erreurs.monTel && (
              <p className="erreur" id="monTel-erreur">
                {erreurs.monTel}
              </p>
            )}
          </div>

          <button className="btn btn-plein btn-large" disabled={enCours}>
            {enCours ? 'Publication…' : 'Publier la déclaration'}
          </button>
        </form>

        <aside>
          <div className="section-tete">
            <span className="cote">Ce qui est publié, ce qui ne l’est pas</span>
          </div>
          <dl className="lignes">
            {GARANTIES.map(({ cote, texte }) => (
              <div
                key={cote}
                className="ligne"
                style={{ gridTemplateColumns: '30px 1fr' }}
              >
                <dt className="cote" style={{ paddingTop: 3 }}>
                  {cote}
                </dt>
                <dd style={{ fontSize: 'var(--t-fine)', lineHeight: 'var(--lh-lead)' }}>{texte}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
