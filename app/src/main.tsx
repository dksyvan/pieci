import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './context/AppContext';

const racine = document.getElementById('root')!;

const arbre = (
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);

/**
 * Le HTML est pré-rendu au build (voir scripts/prerender.mjs) : on reprend la
 * page là où le serveur l'a laissée au lieu de la reconstruire. Le texte reste
 * affiché sans clignotement pendant que React s'installe par-dessus.
 *
 * Le repli sur `createRoot` couvre le cas où la racine arrive vide — un
 * pré-rendu qui a échoué pour cette page, ou le serveur de développement, qui
 * sert le gabarit brut.
 */
if (racine.hasChildNodes()) {
  hydrateRoot(racine, arbre);
} else {
  createRoot(racine).render(arbre);
}
