import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Accueil } from './pages/Accueil';
import { Trouvees } from './pages/Trouvees';
import { Declarer } from './pages/Declarer';
import { Perdu } from './pages/Perdu';
import { Suivi } from './pages/Suivi';
import { Soutenir } from './pages/Soutenir';
import { Guides } from './pages/Guides';
import { GuideDetail } from './pages/GuideDetail';

/**
 * La carte est chargée à la demande. Leaflet lit `window` dès son importation :
 * tant qu'il figurait dans le graphe synchrone, aucune page ne pouvait être
 * pré-rendue. Le charger paresseusement règle les deux problèmes d'un coup —
 * le pré-rendu redevient possible, et les 150 ko de la bibliothèque cartogra-
 * phique ne pèsent plus sur les visiteurs qui ne vont jamais sur la carte.
 */
const Carte = lazy(async () => ({ default: (await import('./pages/Carte')).Carte }));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="trouvees" element={<Trouvees />} />
        {/* Une page par commune et par type : voir contenu/registre.ts */}
        <Route path="trouvees/:filtre" element={<Trouvees />} />
        <Route
          path="carte"
          element={
            <Suspense fallback={<div className="section wrap" aria-busy="true" />}>
              <Carte />
            </Suspense>
          }
        />
        <Route path="declarer" element={<Declarer />} />
        <Route path="perdu" element={<Perdu />} />
        <Route path="suivi" element={<Suivi />} />
        <Route path="soutenir" element={<Soutenir />} />
        <Route path="guides" element={<Guides />} />
        <Route path="guides/:slug" element={<GuideDetail />} />
      </Route>
    </Routes>
  );
}
