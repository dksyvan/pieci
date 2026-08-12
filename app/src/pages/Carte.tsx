import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { echapperHtml, relDate } from '../lib/format';
import { urlMedia } from '../lib/api';
import { IconeFleche } from '../components/Icones';

const ENCRE = '#14202E';
const CACHET = '#B03A22';
const OFFICIEL = '#1B6B4A';

/** Repère carré — la même grammaire que le reste : aucun rayon, un filet. */
function repere(couleur: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:11px;height:11px;background:${couleur};border:1px solid ${ENCRE}"></span>`,
    iconSize: [11, 11],
    iconAnchor: [6, 6],
  });
}

export function Carte() {
  const { piecesTrouvees, pointsDepot } = useApp();
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conteneur.current) return;

    const carte = L.map(conteneur.current).setView([5.345, -4.0], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(carte);

    piecesTrouvees.forEach((p) => {
      const photo = p.photoFlouteeUrl
        ? `<img src="${urlMedia(p.photoFlouteeUrl)}" alt="Pièce déclarée, photo floutée" style="width:100%;margin-top:6px;display:block;border:1px solid #A9A294">`
        : '';
      const lieu = p.quartier
        ? `${echapperHtml(p.commune)}, ${echapperHtml(p.quartier)}`
        : echapperHtml(p.commune);

      L.marker([p.lat, p.lng], { icon: repere(CACHET), alt: `${p.prenom} ${p.nomInitiale}.` })
        .addTo(carte)
        .bindPopup(
          `<b>${echapperHtml(p.prenom)} ${echapperHtml(p.nomInitiale)}.</b><br>` +
            `<span style="text-transform:uppercase;letter-spacing:.06em;font-size:11px">${echapperHtml(p.typePiece)}</span><br>` +
            `<small>${lieu} · déclarée ${relDate(p.dateTrouvaille)}</small>${photo}`,
        );
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
  }, [piecesTrouvees, pointsDepot]);

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
          Pièce déclarée ({piecesTrouvees.length})
        </span>
        <span>
          <i style={{ background: OFFICIEL, border: `1px solid ${ENCRE}` }} />
          Point de dépôt sûr — mairie, commissariat ({pointsDepot.length})
        </span>
      </div>
    </section>
  );
}
