import { StrictMode } from 'react';
// En React Router v7, les entrées serveur vivent dans `react-router` :
// `react-router-dom` n'est plus qu'une ré-exportation côté navigateur.
import { StaticRouter } from 'react-router';
import App from './App';
import { AppProvider } from './context/AppContext';

/**
 * Point d'entrée du pré-rendu.
 *
 * `AppProvider` charge le registre dans un `useEffect`, qui ne s'exécute jamais
 * au rendu statique : les pages dynamiques sont donc figées dans leur état de
 * chargement. C'est voulu — le registre change à chaque déclaration, le geler
 * dans le HTML servirait des données périmées. Ce qui compte pour un moteur de
 * recherche, ce sont les guides et les pages fixes, dont le contenu est
 * entièrement présent dès le rendu.
 */
export function rendre(chemin: string) {
  return (
    <StrictMode>
      <StaticRouter location={chemin}>
        <AppProvider>
          <App />
        </AppProvider>
      </StaticRouter>
    </StrictMode>
  );
}
