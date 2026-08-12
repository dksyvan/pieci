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

const ONGLETS: Onglet[] = [
  { chemin: '/', label: 'Accueil', court: 'Accueil', Icone: IconeAccueil, mobile: true },
  { chemin: '/trouvees', label: 'Registre', court: 'Registre', Icone: IconeRegistre, mobile: true },
  { chemin: '/carte', label: 'Carte', court: 'Carte', Icone: IconeCarte, mobile: false },
  { chemin: '/declarer', label: "J'ai trouvé", court: "J'ai trouvé", Icone: IconeDeclarer, mobile: true },
  { chemin: '/perdu', label: "J'ai perdu", court: "J'ai perdu", Icone: IconeRecherche, mobile: true },
  { chemin: '/suivi', label: 'Suivi', court: 'Suivi', Icone: IconeSuivi, mobile: true },
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
            {ONGLETS.map(({ chemin, label }) => (
              <NavLink
                key={chemin}
                to={chemin}
                end={chemin === '/'}
                className={({ isActive }) => 'onglet' + (isActive ? ' actif' : '')}
              >
                {label}
              </NavLink>
            ))}
            <NavLink
              to="/soutenir"
              className={({ isActive }) => 'onglet' + (isActive ? ' actif' : '')}
              style={{ color: 'var(--color-cachet)' }}
            >
              Soutenir
            </NavLink>
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
              {ONGLETS.map(({ chemin, label }) => (
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
        {ONGLETS.filter((o) => o.mobile).map(({ chemin, court, Icone }) => (
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
