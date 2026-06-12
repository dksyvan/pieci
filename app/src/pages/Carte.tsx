import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { useApp } from '../context/AppContext';
import { TYPE_ICONES } from '../types';
import { echapperHtml, relDate } from '../lib/format';
import { urlMedia } from '../lib/api';

function iconePoint(couleur: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${couleur};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
  });
}

export function Carte() {
  const { piecesTrouvees, pointsDepot } = useApp();
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conteneurRef.current) return;

    const carte = L.map(conteneurRef.current).setView([5.345, -4.0], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(carte);

    piecesTrouvees.forEach((p) => {
      const photo = p.photoFlouteeUrl
        ? `<img src="${urlMedia(p.photoFlouteeUrl)}" alt="Photo de la pièce (floutée)" style="width:100%;border-radius:8px;margin-top:6px;display:block">`
        : '';

      L.marker([p.lat, p.lng], { icon: iconePoint('#F77F2E') })
        .addTo(carte)
        .bindPopup(
          `<b>${echapperHtml(p.prenom)} ${echapperHtml(p.nomInitiale)}</b><br>${TYPE_ICONES[p.typePiece]} ${p.typePiece}<br><small>${echapperHtml(p.commune)}${p.quartier ? ', ' + echapperHtml(p.quartier) : ''} · trouvée ${relDate(p.dateTrouvaille)}</small>${photo}`,
        );
    });

    pointsDepot.forEach((d) => {
      L.marker([d.lat, d.lng], { icon: iconePoint('#13A05C') })
        .addTo(carte)
        .bindPopup(`<b>Point de dépôt</b><br>${echapperHtml(d.nom)}`);
    });

    return () => {
      carte.remove();
    };
  }, [piecesTrouvees, pointsDepot]);

  return (
    <section className="block wrap">
      <div className="sec-head">
        <div>
          <h2>Carte des trouvailles</h2>
          <p>Visualise où les pièces ont été trouvées et où les récupérer en toute sécurité.</p>
        </div>
      </div>
      <div id="map" ref={conteneurRef} />
      <div className="legend">
        <span>
          <i style={{ background: '#F77F2E' }} />
          Pièce trouvée
        </span>
        <span>
          <i style={{ background: '#13A05C' }} />
          Point de dépôt sûr (mairie / commissariat)
        </span>
      </div>
    </section>
  );
}
