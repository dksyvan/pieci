import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GuideDetail } from './GuideDetail';
import { Guides } from './Guides';
import { GUIDES, GUIDES_PUBLIES } from '../contenu';
import { texteBrut } from '../contenu/types';

/**
 * Ce que la page affiche, et ce que le balisage déclare, sont le même texte.
 *
 * Les deux sortent du même tableau `faq`, mais par deux chemins de réduction
 * différents : le balisage passe par `texteBrut` (scripts/prerender.mjs), la
 * page par le composant `RendreTexte`. Tant que rien ne les compare, ils
 * peuvent diverger en silence — et Google ne sanctionne pas la question
 * fautive, il déclasse la page. C'est déjà arrivé une fois : un
 * `<span class="sr-only"> (nouvel onglet)</span>` posé DANS le lien était un
 * nœud de texte du paragraphe, et la réponse affichée ne fut plus celle
 * déclarée. Le présent fichier existe pour que la prochaine fois soit rouge.
 *
 * Le rendu passe par les composants eux-mêmes, dans un routeur en mémoire :
 * tout vient de `react-router-dom`, d'un seul tenant. Charger le point
 * d'entrée du pré-rendu, qui prend son routeur dans `react-router`, ferait
 * deux instances du module et donc deux contextes distincts sous Vitest.
 */

/** Entités que React échappe dans le texte. Les seules qu'on puisse croiser. */
const ENTITES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** Texte visible d'un HTML rendu, balises retirées. */
function texteVisible(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#x27|#39);/g, (e) => ENTITES[e] ?? e)
    .replace(/\s+/g, ' ');
}

/** Rend la page d'un guide comme le visiteur la recevra. */
function rendreGuide(slug: string): string {
  return texteVisible(
    renderToString(
      <MemoryRouter initialEntries={[`/guides/${slug}`]}>
        <Routes>
          <Route path="/guides/:slug" element={<GuideDetail />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

/** Rend l'index des guides. Sert au test du brouillon, plus bas. */
function rendreIndex(): string {
  return renderToString(
    <MemoryRouter initialEntries={['/guides']}>
      <Guides />
    </MemoryRouter>,
  );
}

describe('questions fréquentes — affiché et déclaré', () => {
  const avecFaq = GUIDES.filter((g) => g.faq?.length);

  it('a des guides à vérifier', () => {
    expect(avecFaq.length).toBeGreaterThan(0);
  });

  it('affiche mot pour mot chaque question déclarée', () => {
    for (const g of avecFaq) {
      const page = rendreGuide(g.slug);
      for (const q of g.faq!) {
        expect(page, `${g.slug} : question « ${q.question} »`).toContain(q.question);
      }
    }
  });

  /**
   * Le point délicat : une réponse contenant un lien est recomposée par
   * `RendreTexte` à partir de fragments. Un espace oublié en fin de chaîne, un
   * nœud de texte glissé dans le `<a>`, et la phrase affichée n'est plus celle
   * qui part dans le `FAQPage`.
   */
  it('affiche mot pour mot chaque réponse déclarée', () => {
    for (const g of avecFaq) {
      const page = rendreGuide(g.slug);
      for (const q of g.faq!) {
        const attendu = texteBrut(q.reponse).replace(/\s+/g, ' ');
        expect(page, `${g.slug} : réponse à « ${q.question} »`).toContain(attendu);
      }
    }
  });
});

describe('corps de l’article rendu', () => {
  /**
   * Toute la raison d'être du pré-rendu : la page doit être lisible sans
   * exécuter une ligne de script. Si le texte n'est pas là au premier rendu,
   * Google l'indexera tard ou pas du tout, et les robots d'aperçu jamais.
   */
  it('contient le chapô et tous les titres de section', () => {
    for (const g of GUIDES_PUBLIES) {
      const page = rendreGuide(g.slug);
      expect(page, `${g.slug} : chapô absent`).toContain(g.chapo.replace(/\s+/g, ' '));
      for (const s of g.sections) {
        expect(page, `${g.slug} : section « ${s.titre} » absente`).toContain(s.titre);
      }
    }
  });

  /**
   * Un lien externe s'ouvre ailleurs : sans `rel`, la page ouverte garde une
   * prise sur la nôtre, et le lecteur n'est pas prévenu qu'il a changé de
   * site. Les deux se vérifient sur le HTML, pas sur l'intention.
   */
  it('arme chaque lien externe, et lui seul', () => {
    for (const g of GUIDES) {
      const html = renderToString(
        <MemoryRouter initialEntries={[`/guides/${g.slug}`]}>
          <Routes>
            <Route path="/guides/:slug" element={<GuideDetail />} />
          </Routes>
        </MemoryRouter>,
      );
      for (const balise of html.match(/<a [^>]*>/g) ?? []) {
        const externe = /href="https?:\/\//.test(balise);
        expect(/target="_blank"/.test(balise), `${g.slug} : ${balise}`).toBe(externe);
        if (externe) {
          expect(balise, `${g.slug} : ${balise}`).toContain('rel="noopener noreferrer"');
          expect(balise, `${g.slug} : ${balise}`).toContain('nouvel onglet');
        }
      }
    }
  });
});

describe('brouillon', () => {
  const brouillons = GUIDES.filter((g) => g.brouillon);

  it('se rend à son adresse, avertissement compris', () => {
    for (const g of brouillons) {
      const page = rendreGuide(g.slug);
      expect(page, g.slug).toContain(g.titre);
      if (g.avertissement) {
        expect(page, `${g.slug} : avertissement absent`).toContain(g.avertissement.titre);
      }
      // Le bandeau reste sous les yeux du relecteur tant que la page n'est pas
      // publiée : c'est lui qui rappelle pourquoi elle est là.
      expect(page, `${g.slug} : bandeau de brouillon absent`).toContain('Brouillon');
    }
  });

  it('n’est proposé nulle part dans l’index des guides', () => {
    const index = rendreIndex();
    for (const g of brouillons) {
      expect(index, `${g.slug} apparaît dans /guides`).not.toContain(g.titre);
      expect(index, `${g.slug} est lié depuis /guides`).not.toContain(`/guides/${g.slug}`);
    }
  });
});
