import { useEffect, useMemo, useRef } from 'react';
import { nomPublic } from '@partage/partage';
import * as L from 'leaflet';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { echapperHtml, relDate } from '../lib/format';
import { urlMedia, type PieceTrouveePublique } from '../lib/api';
import { IconeFleche } from '../components/Icones';

const ENCRE = '#14202E';
const CACHET = '#B03A22';
const OFFICIEL = '#1B6B4A';

/**
 * Repère carré — la même grammaire que le reste : aucun rayon, un filet.
 * Quand plusieurs pièces partagent l'emplacement, il grandit et porte leur
 * nombre.
 */
function repere(couleur: string, nombre = 1): L.DivIcon {
  if (nombre <= 1) {
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:11px;height:11px;background:${couleur};border:1px solid ${ENCRE}"></span>`,
      iconSize: [11, 11],
      iconAnchor: [6, 6],
    });
  }
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;background:${couleur};border:1px solid ${ENCRE};color:#fff;font:600 10px/1 system-ui,sans-serif">${nombre}</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Ligne d'une pièce dans la bulle d'un emplacement. */
function lignePiece(p: PieceTrouveePublique): string {
  const photo = p.photoFlouteeUrl
    ? `<img src="${urlMedia(p.photoFlouteeUrl)}" alt="Pièce déclarée, photo floutée" style="width:100%;margin-top:6px;display:block;border:1px solid #A9A294">`
    : '';
  const lieu = p.quartier
    ? `${echapperHtml(p.commune)}, ${echapperHtml(p.quartier)}`
    : echapperHtml(p.commune);
  return (
    `<b>${echapperHtml(nomPublic(p))}</b><br>` +
    `<span style="text-transform:uppercase;letter-spacing:.06em;font-size:11px">${echapperHtml(p.typePiece)}</span><br>` +
    `<small>${lieu} · déclarée ${relDate(p.dateTrouvaille)}</small>${photo}`
  );
}

/**
 * Regroupe les pièces par emplacement.
 *
 * Les positions publiques sont arrondies à l'échelle du quartier : plusieurs
 * pièces tombent exactement au même point. Un repère par pièce les empilait
 * au même pixel, et seule la dernière restait cliquable.
 */
function parEmplacement(pieces: PieceTrouveePublique[]): PieceTrouveePublique[][] {
  const groupes = new Map<string, PieceTrouveePublique[]>();
  for (const p of pieces) {
    const cle = `${p.lat},${p.lng}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), p]);
  }
  return [...groupes.values()];
}

export function Carte() {
  const { piecesTrouvees, pointsDepot } = useApp();
  const conteneur = useRef<HTMLDivElement>(null);
  const emplacements = useMemo(() => parEmplacement(piecesTrouvees), [piecesTrouvees]);

  useEffect(() => {
    if (!conteneur.current) return;

    const carte = L.map(conteneur.current).setView([5.345, -4.0], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(carte);

    emplacements.forEach((groupe) => {
      const [premiere] = groupe;
      const entete =
        groupe.length > 1
          ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${groupe.length} pièces déclarées ici</div>`
          : '';
      L.marker([premiere.lat, premiere.lng], {
        icon: repere(CACHET, groupe.length),
        alt: groupe.length > 1 ? `${groupe.length} pièces déclarées` : nomPublic(premiere),
      })
        .addTo(carte)
        .bindPopup(entete + groupe.map(lignePiece).join('<hr style="margin:8px 0;border:0;border-top:1px solid #A9A294">'), {
          maxHeight: 320,
        });
    });

    pointsDepot.forEach((d) => {
      L.marker([d.lat, d.lng], { icon: repere(OFFICIEL), alt: d.nom })
        .addTo(carte)
        .bindPopup(
          `<b>${echapperHtml(d.nom)}</b><br><small>Point de dépôt · ${echapperHtml(d.commune)}</small>`,
        );
    });

    return () => {
      carte.remove();
    };
  }, [emplacements, pointsDepot]);

  return (
    <section className="section wrap">
      <div className="section-tete">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <div>
            <span className="cote">Le registre sur la carte</span>
            <h2 style={{ marginTop: 6 }}>Carte des trouvailles</h2>
          </div>
          <Link to="/trouvees" className="lien" style={{ alignSelf: 'flex-end' }}>
            Revenir à la liste
            <IconeFleche taille={15} />
          </Link>
        </div>
        <p>
          Vois où les pièces ont été trouvées et où les récupérer en sécurité. Les repères montrent la
          commune, jamais l’adresse exacte de quelqu’un.
        </p>
      </div>

      <div id="carte" ref={conteneur} role="application" aria-label="Carte des pièces déclarées" />

      <div className="legende">
        <span>
          <i style={{ background: CACHET, border: `1px solid ${ENCRE}` }} />
          Pièce déclarée ({piecesTrouvees.length}
          {emplacements.length < piecesTrouvees.length
            ? `, sur ${emplacements.length} emplacement${emplacements.length > 1 ? 's' : ''}`
            : ''}
          )
        </span>
        <span>
          <i style={{ background: OFFICIEL, border: `1px solid ${ENCRE}` }} />
          Point de dépôt sûr — mairie, commissariat ({pointsDepot.length})
        </span>
      </div>
    </section>
  );
}
