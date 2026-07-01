import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '../types';
import { COMMUNES, type LatLng } from '../data/communes';
import { GeoField } from '../components/GeoField';
import { BandeauPush } from '../components/BandeauPush';
import { useApp } from '../context/AppContext';
import { ApiError, uploaderPhotoPiece } from '../lib/api';

const AUTRE_DEPOT = '__autre__';

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
  const [pointDepotAutreTexte, setPointDepotAutreTexte] = useState('');

  const [monPrenom, setMonPrenom] = useState('');
  const [monNom, setMonNom] = useState('');
  const [monTelephone, setMonTelephone] = useState('');

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [declarationOk, setDeclarationOk] = useState(false);

  const valide = Boolean(typePiece && prenom && nom && commune && monPrenom && monNom && monTelephone);

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const choisirPhoto = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onPhotoChange = (e: ChangeEvent<HTMLInputElement>) => choisirPhoto(e.target.files?.[0]);

  const onDropPhoto = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    choisirPhoto(e.dataTransfer.files?.[0]);
  };

  const retirerPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const soumettre = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valide || !typePiece || envoiEnCours) return;
    const [lat, lng] = coords ?? COMMUNES[commune];

    setEnvoiEnCours(true);
    try {
      const photoUrls = photo ? await uploaderPhotoPiece(photo) : null;

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
        pointDepotAutre:
          pointDepotId === AUTRE_DEPOT && pointDepotAutreTexte.trim()
            ? pointDepotAutreTexte.trim()
            : undefined,
        photoOriginaleUrl: photoUrls?.photoOriginaleUrl,
        photoFlouteeUrl: photoUrls?.photoFlouteeUrl,
      });
      setDeclarationOk(true);
    } catch (err) {
      afficherToast(`⚠️ ${err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie stp.'}`);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (declarationOk) {
    return (
      <section className="block wrap" style={{ maxWidth: 520 }}>
        <div className="panel" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div className="big">✅</div>
          <h2 style={{ marginTop: 8 }}>Déclaration publiée !</h2>
          <p>Merci pour ton geste. L'algorithme va comparer aux alertes actives.</p>
        </div>
        <BandeauPush telephone={monTelephone} onTermine={() => navigate('/trouvees')} />
      </section>
    );
  }

  return (
    <section className="block wrap">
      <div className="sec-head">
        <div>
          <h2>J'ai trouvé une pièce </h2>
          <p>Merci pour ton geste.Le bienfait n'est jamais perdu, Renseigne le minimum — les données resteront protégées.</p>
        </div>
      </div>
      <div className="form-wrap">
        <form className="panel" onSubmit={soumettre}>
          <div className="field">
            <label>Type de pièce</label>
            <select value={typePiece} onChange={(e) => setTypePiece(e.target.value as TypePiece | '')}>
              <option value="">— Choisir —</option>
              {TYPES_PIECE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="row2">
            <div className="field">
              <label>Prénom (sur la pièce)</label>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex : Adjoua" />
            </div>
            <div className="field">
              <label>Nom (sur la pièce)</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Kouassi" />
            </div>
          </div>
          <GeoField commune={commune} setCommune={setCommune} setCoords={setCoords} />
          <div className="field">
            <label>Quartier (optionnel)</label>
            <input
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              placeholder="Ex : Niangon Sud à Gauche"
            />
            <div className="hint">Plus c'est précis, plus vite le propriétaire se repère.</div>
          </div>
          <div className="field">
            <label>Point de dépôt (optionnel)</label>
            <select
              value={pointDepotId}
              onChange={(e) => {
                setPointDepotId(e.target.value);
                if (e.target.value !== AUTRE_DEPOT) setPointDepotAutreTexte('');
              }}
            >
              <option value="">— Je la garde, à convenir avec le propriétaire —</option>
              {pointsDepot.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom} ({d.commune})
                </option>
              ))}
              <option value={AUTRE_DEPOT}>Autre (préciser)</option>
            </select>
            {pointDepotId === AUTRE_DEPOT && (
              <input
                style={{ marginTop: 8 }}
                value={pointDepotAutreTexte}
                onChange={(e) => setPointDepotAutreTexte(e.target.value)}
                placeholder="Ex : Pharmacie du Carrefour, Cocody Angré 8e Tranche"
              />
            )}
          </div>
          <div className="field">
            <label>Photo de la pièce</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              style={{ display: 'none' }}
            />
            {photoPreview ? (
              <div className="upload" style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={photoPreview}
                    alt="Aperçu de la pièce"
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-night)' }}>
                      {photo?.name}
                    </div>
                    <span style={{ fontSize: 12 }}>
                      Le numéro et les données sensibles seront <b>floutés automatiquement</b>.
                    </span>
                  </div>
                  <button type="button" className="linkbtn" onClick={retirerPhoto}>
                    Retirer
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="upload"
                role="button"
                tabIndex={0}
                onClick={() => photoInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    photoInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropPhoto}
                style={{ cursor: 'pointer' }}
              >
                📷 Glisse une photo ici, ou clique pour choisir
                <br />
                <span style={{ fontSize: 12 }}>
                  Le numéro et les données sensibles seront <b>floutés automatiquement</b>.
                </span>
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, color: 'var(--color-night)', marginBottom: 4 }}>
            Tes coordonnées
          </div>
          <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
            Pour qu'on puisse te recontacter si on identifie le propriétaire — Ca ne sera jamais affichées publiquement.
          </p>
          <div className="row2">
            <div className="field">
              <label>Ton prénom</label>
              <input value={monPrenom} onChange={(e) => setMonPrenom(e.target.value)} placeholder="Ex : Justine" />
            </div>
            <div className="field">
              <label>Ton nom</label>
              <input value={monNom} onChange={(e) => setMonNom(e.target.value)} placeholder="Ex : Diby" />
            </div>
          </div>
          <div className="field">
            <label>Ton numéro de téléphone</label>
            <input
              type="tel"
              value={monTelephone}
              onChange={(e) => setMonTelephone(e.target.value)}
              placeholder="Ex : 0700000000"
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!valide || envoiEnCours}>
            {envoiEnCours ? 'Publication…' : 'Publier la déclaration'}
          </button>
        </form>
        <div className="info-side">
          <div className="panel">
            <h3>Pourquoi c'est sûr</h3>
            <ul>
              <li>
                <span className="num">1</span>
                <div>
                  En public, on n'affiche que le <b>prénom + l'initiale du nom</b>, le type et l'adresse complète. Jamais le numéro.
                </div>
              </li>
              <li>
                <span className="num g">2</span>
                <div>
                  La photo est <b>floutée</b> : impossible d'y lire les informations sensibles.
                </div>
              </li>
              <li>
                <span className="num">3</span>
                <div>
                  Le propriétaire est <b>notifié automatiquement</b> si ça correspond à sa recherche.
                </div>
              </li>
              <li>
                <span className="num g">4</span>
                <div>
                  La remise se fait dans un <b>point de dépôt sûr</b>, sans rencontre privée risquée... C'est mieux non ?😏.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
