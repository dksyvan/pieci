import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { COMMUNES, type LatLng } from '@partage/communes';
import { GeoField } from '../components/GeoField';
import { BandeauPush } from '../components/BandeauPush';
import { CartePiece } from '../components/CartePiece';
import { IconeValide } from '../components/Icones';
import { useApp } from '../context/useApp';
import { ApiError, uploaderPhotoPiece } from '../lib/api';

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
  const [publiee, setPubliee] = useState(false);

  const valide = Boolean(
    typePiece && prenom.trim() && nom.trim() && commune && monPrenom.trim() && monNom.trim() && monTelephone.trim(),
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
    if (!valide || !typePiece || enCours) return;
    const [lat, lng] = coords ?? COMMUNES[commune];

    setEnCours(true);
    try {
      const urls = photo ? await uploaderPhotoPiece(photo) : null;

      await publier({
        declarant: { telephone: monTelephone, prenom: monPrenom, nom: monNom },
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
      setPubliee(true);
    } catch (err) {
      afficherToast(err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.');
    } finally {
      setEnCours(false);
    }
  };

  if (publiee) {
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
              <BandeauPush telephone={monTelephone} onTermine={() => navigate('/trouvees')} />
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
            <select id="type" value={typePiece} onChange={(e) => setTypePiece(e.target.value as TypePiece | '')}>
              <option value="">— Choisir —</option>
              {TYPES_PIECE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="duo">
            <div className="champ">
              <label htmlFor="prenom">Prénom (qui est sur la pièce)</label>
              <input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Adjoua" />
            </div>
            <div className="champ">
              <label htmlFor="nom">Nom (qui est sur la pièce)</label>
              <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="N’Guessan" />
            </div>
          </div>

          <GeoField commune={commune} setCommune={setCommune} setCoords={setCoords} />

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
            <label htmlFor="depot">Où la pièce se trouve-t-elle&nbsp;?</label>
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
              <input id="monPrenom" value={monPrenom} onChange={(e) => setMonPrenom(e.target.value)} placeholder="Justine" />
            </div>
            <div className="champ">
              <label htmlFor="monNom">Ton nom</label>
              <input id="monNom" value={monNom} onChange={(e) => setMonNom(e.target.value)} placeholder="Diby" />
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
              onChange={(e) => setMonTelephone(e.target.value)}
              placeholder="07 00 00 00 00"
            />
          </div>

          <button className="btn btn-plein btn-large" disabled={!valide || enCours}>
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
