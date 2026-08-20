import { Link } from 'react-router-dom';
import { PanneauDon } from '../components/PanneauDon';
import { IconeFleche } from '../components/Icones';
import { useApp } from '../context/AppContext';

/** Ce que le don finance, sans chiffrer : les montants réels ne sont pas arrêtés. */
const POSTES = [
  { cote: '01', poste: 'L’hébergement du serveur', detail: 'L’API, la base de données et les photos' },
  { cote: '02', poste: 'Le nom de domaine', detail: 'Renouvelé chaque année' },
  { cote: '03', poste: 'L’envoi des notifications', detail: 'Les alertes de correspondance' },
];

export function Soutenir() {
  const { piecesTrouvees } = useApp();

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Participation libre</span>
        <h2 style={{ marginTop: 6 }}>Si Pièci t’a dépanné</h2>
        <p>
          Retrouver sa pièce, ça évite les files d’attente et les frais de refabrication. Si ça t’est
          arrivé grâce au registre, tu peux participer aux frais — ou ne rien donner du tout, y’a pas
          drap : le service ne change pas.
        </p>
      </div>

      <div className="grille" style={{ rowGap: 'var(--s-5)' }}>
        <div className="col-a">
          <PanneauDon />
        </div>

        <aside className="col-b">
          <div className="section-tete">
            <span className="cote">À quoi ça sert</span>
          </div>
          <dl className="lignes">
            {POSTES.map(({ cote, poste, detail }) => (
              <div className="ligne" key={cote} style={{ gridTemplateColumns: '30px 1fr' }}>
                <dt className="cote" style={{ paddingTop: 3 }}>
                  {cote}
                </dt>
                <dd>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{poste}</div>
                  <div className="ligne-meta">{detail}</div>
                </dd>
              </div>
            ))}
          </dl>

          <p className="aide" style={{ marginTop: 'var(--s-3)' }}>
            S’il reste quelque chose, ça ira à publier l’application sur le Play Store, puis à
            rembourser le transport de ceux qui déposent une pièce en mairie.
          </p>

          <div className="vide" style={{ marginTop: 'var(--s-5)' }}>
            <h3>Aider sans payer</h3>
            <p>
              Parle du registre autour de toi. {piecesTrouvees.length > 0
                ? `${piecesTrouvees.length} pièce${piecesTrouvees.length > 1 ? 's' : ''} y ${piecesTrouvees.length > 1 ? 'sont' : 'est'} déjà déclarée${piecesTrouvees.length > 1 ? 's' : ''}`
                : 'Il n’attend que sa première déclaration'} — plus on est nombreux, plus les pièces
              retrouvent leur propriétaire. On est ensemble.
            </p>
            <Link to="/trouvees" className="lien" style={{ marginTop: 'var(--s-3)' }}>
              Voir le registre
              <IconeFleche taille={15} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
