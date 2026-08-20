import type { ComponentType } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import {
  IconeAccueil,
  IconeCarte,
  IconeDeclarer,
  IconeRecherche,
  IconeRegistre,
  IconeSuivi,
} from './Icones';
import { useApp } from '../context/AppContext';

interface Onglet {
  chemin: string;
  label: string;
  court: string;
  Icone: ComponentType<{ taille?: number }>;
  /** Présent dans la barre du bas sur mobile — cinq entrées, pas davantage. */
  mobile: boolean;
}

/**
 * Deux actions principales, et deux seulement. Tout le produit tient dans
 * « j'ai trouvé » et « j'ai perdu » — le registre, la carte et le suivi sont
 * des vues de consultation, pas des points d'entrée.
 */
const ACTIONS: Onglet[] = [
  { chemin: '/declarer', label: "J'ai trouvé une pièce", court: "J'ai trouvé", Icone: IconeDeclarer, mobile: true },
  { chemin: '/perdu', label: "J'ai perdu ma pièce", court: "J'ai perdu", Icone: IconeRecherche, mobile: true },
];

/** Consultation : accessibles depuis le pied de page et la barre mobile. */
const SECONDAIRES: Onglet[] = [
  { chemin: '/', label: 'Accueil', court: 'Accueil', Icone: IconeAccueil, mobile: true },
  { chemin: '/trouvees', label: 'Registre', court: 'Registre', Icone: IconeRegistre, mobile: true },
  { chemin: '/carte', label: 'Carte', court: 'Carte', Icone: IconeCarte, mobile: false },
  { chemin: '/suivi', label: 'Suivi', court: 'Suivi', Icone: IconeSuivi, mobile: true },
];

/** Ordre de la barre du bas : accueil, les deux actions, puis le suivi. */
const ORDRE_MOBILE: Onglet[] = [
  SECONDAIRES[0],
  ACTIONS[0],
  ACTIONS[1],
  SECONDAIRES[1],
  SECONDAIRES[3],
];

const ANNEE = new Date().getFullYear();

/** Ossature commune : en-tête, page, pied de page, barre mobile et avis. */
export function Layout() {
  const { toast } = useApp();

  return (
    <>
      <header className="entete">
        <div className="wrap entete-in">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="onglets" aria-label="Navigation principale">
            {ACTIONS.map(({ chemin, label }) => (
              <NavLink
                key={chemin}
                to={chemin}
                className={({ isActive }) => 'onglet onglet-action' + (isActive ? ' actif' : '')}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="pied">
        <div className="wrap">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--s-4)',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <Logo />
            <nav className="pied-nav" aria-label="Navigation secondaire">
              {[...SECONDAIRES, ...ACTIONS].map(({ chemin, label }) => (
                <Link key={chemin} to={chemin} className="label">
                  {label}
                </Link>
              ))}
              <Link to="/soutenir" className="label" style={{ color: 'var(--color-cachet)' }}>
                Soutenir
              </Link>
            </nav>
          </div>
          <p className="aide" style={{ marginTop: 'var(--s-3)' }}>
            Pièci ne publie jamais un numéro de pièce, une photo nette ni un numéro de téléphone. Les
            coordonnées ne circulent qu’entre les deux personnes concernées, après confirmation des deux
            côtés.
          </p>
          <p className="pied-mention">
            Pièci — la solidarité ivoirienne, rendue efficace.
            <br />
            Conçu et développé par <b style={{ color: 'var(--color-encre)' }}>DIBY&nbsp;Yvan</b>.
            © {ANNEE} · Abidjan, Côte d’Ivoire.
          </p>
        </div>
      </footer>

      {toast && (
        <div className="avis" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <nav className="nav-mob" aria-label="Navigation mobile">
        {ORDRE_MOBILE.map(({ chemin, court, Icone }) => (
          <NavLink
            key={chemin}
            to={chemin}
            end={chemin === '/'}
            className={({ isActive }) => (isActive ? 'actif' : undefined)}
          >
            <Icone taille={18} />
            {court}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
