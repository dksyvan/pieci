import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { useApp } from '../context/AppContext';

interface Onglet {
  chemin: string;
  label: string;
  labelMobile: string;
  icone: string;
}

const ONGLETS: Onglet[] = [
  { chemin: '/', label: 'Accueil', labelMobile: 'Accueil', icone: '🏠' },
  { chemin: '/trouvees', label: 'Pièces trouvées', labelMobile: 'Trouvées', icone: '🪪' },
  { chemin: '/carte', label: 'Carte', labelMobile: 'Carte', icone: '🗺️' },
  { chemin: '/declarer', label: "J'ai trouvé", labelMobile: 'Trouvé', icone: '✋' },
  { chemin: '/perdu', label: "J'ai perdu", labelMobile: 'Perdu', icone: '🔎' }, //TODO: remove icone
  { chemin: '/suivi', label: 'Suivi', labelMobile: 'Suivi', icone: '🔔' },
];

/** Ossature commune : barre de navigation, contenu de la page, pied de page, nav mobile et toast. */
export function Layout() {
  const { toast } = useApp();

  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <Logo />
          <nav className="tabs">
            {ONGLETS.map((onglet) => (
              <NavLink
                key={onglet.chemin}
                to={onglet.chemin}
                end={onglet.chemin === '/'}
                className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
              >
                {onglet.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="foot">
        <div className="wrap">
          <Logo />
          <small>Pièci — la solidarité ivoirienne, rendue efficace. © 2026 · Prototype.</small>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      <nav className="mobnav">
        {ONGLETS.map((onglet) => (
          <NavLink
            key={onglet.chemin}
            to={onglet.chemin}
            end={onglet.chemin === '/'}
            className={({ isActive }) => 'mob' + (isActive ? ' active' : '')}
          >
            <div style={{ fontSize: 20 }}>{onglet.icone}</div>
            {onglet.labelMobile}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
