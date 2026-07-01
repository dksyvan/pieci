import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Accueil } from './pages/Accueil';
import { Trouvees } from './pages/Trouvees';
import { Carte } from './pages/Carte';
import { Declarer } from './pages/Declarer';
import { Perdu } from './pages/Perdu';
import { Suivi } from './pages/Suivi';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="trouvees" element={<Trouvees />} />
        <Route path="carte" element={<Carte />} />
        <Route path="declarer" element={<Declarer />} />
        <Route path="perdu" element={<Perdu />} />
        <Route path="suivi" element={<Suivi />} />
      </Route>
    </Routes>
  );
}
