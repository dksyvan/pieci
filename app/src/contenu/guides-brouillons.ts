import type { Guide } from './types';

/**
 * Guides écrits mais pas encore publiables.
 *
 * Un brouillon se lit à son adresse, dans sa vraie mise en page, pour être
 * relu comme le lecteur le verra — mais il porte `noindex`, ne figure ni au
 * sitemap ni dans l'index /guides, et aucun autre guide ne le propose. Une
 * page à moitié publiée est pire qu'une page absente : Google l'indexe en
 * quelques heures et la garde des semaines après la correction.
 *
 * On sort d'ici en retirant `brouillon`, et pas autrement.
 */

/**
 * Guide du permis de conduire, en brouillon.
 *
 * L'article est écrit et relu, mais la procédure elle-même ne l'est pas : la
 * page officielle qui a servi de source traite d'une démarche voisine et date
 * de 2016. D'où `brouillon: true` — la page se construit et se lit à son
 * adresse pour la relecture, sans être indexée ni listée. Une page
 * administrative à moitié juste coûte plus cher qu'une page absente : elle
 * envoie quelqu'un faire la queue avec le mauvais dossier.
 *
 * Les mentions « [À confirmer auprès du CGI : …] » sont conservées telles
 * quelles, crochets compris. Ce ne sont pas des notes de travail à nettoyer
 * avant publication : c'est ce qui rend visible, en relisant la page rendue,
 * l'écart exact qui reste à combler avec le CGI. Elles disparaîtront avec le
 * coup de téléphone, pas avant.
 *
 * Même règle d'écriture que dans les autres fichiers de guides : aucun
 * montant, aucun tarif. Les sources se contredisent et les chiffres changent ;
 * on renvoie au service compétent, seul à engager quoi que ce soit.
 */
export const permisBrouillon: Guide = {
  slug: 'perdre-son-permis-de-conduire',
  titre: 'Permis de conduire perdu en Côte d’Ivoire : que faire',
  description:
    'Déclaration de perte, attestation de non-retrait, duplicata au CGI : la marche à suivre quand votre permis de conduire a disparu.',
  chapo:
    'Perdre son permis, quand on conduit pour travailler, ce n’est pas un désagrément : c’est une perte de revenus chaque jour où l’on ne roule pas. Voici la marche à suivre.',
  miseAJour: '2026-09-17',
  question: 'J’ai perdu mon permis de conduire en Côte d’Ivoire, que faire ?',
  brouillon: true,
  // L'encadré de tête du Markdown devient `avertissement`, pas une section :
  // il s'adresse au relecteur avant le lecteur, et doit être lu avant le
  // sommaire. Le numéro du CGI y est cliquable parce que c'est exactement
  // l'action attendue de la relecture — appeler, puis lever le brouillon.
  avertissement: {
    titre: 'À vérifier avant publication',
    texte: [
      'Les éléments de cet article proviennent du portail Service Public ivoirien et du Centre de Gestion Intégrée, mais la page officielle consultée traite d’une démarche voisine et date de 2016. Avant de mettre ce guide en ligne, appelez le CGI au ',
      { texte: '+225 27 22 47 95 60', href: 'tel:+2252722479560' },
      ' pour confirmer la liste exacte des pièces, les tarifs et l’adresse du guichet. Les passages à confirmer sont signalés.',
    ],
  },
  sections: [
    {
      titre: 'Vérifiez d’abord s’il a été retrouvé',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Avant d’engager la procédure, créez une alerte sur ',
            { texte: 'pieci.ci/perdu', href: '/perdu' },
            '. C’est gratuit, ça prend une minute, et la recherche se fait par votre nom — pas besoin du numéro du permis, que vous n’avez plus sous les yeux.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Les permis de conduire font partie des documents les plus souvent ramassés et rendus : ils tombent des poches, des sacoches, des boîtes à gants. Le nôtre, le tout premier déclaré sur Pièci, avait été accroché sur un panneau publicitaire à 2 Plateaux par quelqu’un qui espérait que le propriétaire passe par là.',
        },
        {
          type: 'paragraphe',
          texte:
            'Contrairement à la carte d’identité, le permis n’a pas de service de recherche officiel en ligne. Si personne ne vous prévient, vous ne saurez jamais qu’il a été retrouvé.',
        },
      ],
    },
    {
      // Les quatre « Étape n — … » du Markdown sont des titres de même niveau,
      // mais ils forment une seule séquence ordonnée : un bloc `etapes` les
      // numérote au rendu et évite quatre sections d'un paragraphe chacune.
      // Le contenu de l'étape 3 — l'adresse du CGI et le dossier — déborde ce
      // format et passe en section propre, juste après.
      titre: 'La procédure, étape par étape',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Étape 1 — La déclaration de perte',
              texte:
                'Rendez-vous dans un commissariat, une brigade de gendarmerie ou à la préfecture de police et demandez un certificat de déclaration de perte du permis de conduire. C’est la pièce maîtresse du dossier : rien ne se fait sans elle. Demandez-la en original, et faites-en des photocopies immédiatement.',
            },
            {
              titre: 'Étape 2 — L’attestation de non-retrait',
              texte:
                'C’est l’étape que beaucoup découvrent trop tard. En cas de déclaration de perte, l’administration demande également une attestation de non-retrait du permis de conduire, délivrée par l’administration en charge du transport routier. Elle atteste que votre permis n’a pas été retiré par décision administrative ou judiciaire — autrement dit, que vous l’avez bien perdu et qu’il ne vous a pas été confisqué. [À confirmer auprès du CGI : où exactement se retire ce document et sous quel délai.]',
            },
            {
              titre: 'Étape 3 — La demande de duplicata',
              texte:
                'La demande se fait auprès du Centre de Gestion Intégrée (CGI), l’organisme en charge des titres de transport routier.',
            },
            {
              titre: 'Étape 4 — Le retrait',
              texte:
                'Apportez une pièce d’identité originale et le récépissé remis lors du dépôt.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Le dossier à déposer au CGI',
      blocs: [
        {
          // Le bloc de coordonnées du Markdown, remis à plat : trois lignes
          // sans verbe ne font pas un paragraphe lisible sur un téléphone, et
          // les deux sites de référence méritent d'être atteignables au pouce.
          type: 'paragraphe',
          texte: [
            'Centre de Gestion Intégrée (CGI) — téléphone : ',
            { texte: '+225 27 22 47 95 60', href: 'tel:+2252722479560' },
            '. Sites de référence : ',
            { texte: 'transports.gouv.ci', href: 'https://www.transports.gouv.ci' },
            ' et ',
            { texte: 'quipuxafrique.com', href: 'https://www.quipuxafrique.com' },
            '.',
          ],
        },
        {
          type: 'paragraphe',
          texte: 'Prévoyez, d’après les éléments publiés :',
        },
        {
          type: 'liste',
          items: [
            'le certificat de déclaration de perte en original ;',
            'l’attestation de non-retrait en original ;',
            'une pièce d’identité en cours de validité (original) ;',
            'une photocopie lisible de votre permis si vous en avez une.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            '[À confirmer auprès du CGI : la liste complète, les photos d’identité éventuellement demandées, et le montant des frais.]',
        },
        {
          // L'encadré du Markdown reste un encadré : il ne sert à rien
          // aujourd'hui, tout son intérêt est d'être lu maintenant pour la
          // fois d'après. Fondu dans un paragraphe, il serait sauté.
          type: 'encadre',
          titre: 'Le conseil qui change tout, et il est pour plus tard',
          texte:
            'Une fois votre nouveau permis en main, photographiez-le recto-verso et rangez l’image quelque part de sûr. La photocopie du permis perdu est demandée à plusieurs étapes — ceux qui l’ont gagnent des jours.',
        },
      ],
    },
    {
      titre: 'Le réflexe utile',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Avant de payer un duplicata, cherchez : ',
            { texte: 'pieci.ci/perdu', href: '/perdu' },
            '. Une minute, gratuit, par votre nom.',
          ],
        },
        {
          type: 'paragraphe',
          texte: [
            'Et si c’est vous qui trouvez un permis un jour, ne l’accrochez pas sur un poteau : ',
            { texte: 'déclarez-le', href: '/declarer' },
            ' et déposez-le au commissariat. Il reviendra vraiment à son propriétaire.',
          ],
        },
      ],
    },
    {
      // Les sources restent dans la page, et visibles. Sur une démarche
      // administrative, c'est ce qui sépare un guide d'une rumeur — et c'est
      // ce qui permet au relecteur de refaire le chemin avant de publier.
      titre: 'Sources',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Sources : ',
            {
              texte: 'Service Public de Côte d’Ivoire — permis de conduire',
              href: 'https://servicepublic.gouv.ci/accueil/demarcheparticulier/2/24/7',
            },
            ', ',
            { texte: 'Ministère des Transports', href: 'https://www.transports.gouv.ci' },
            '. Les procédures et les tarifs évoluent : confirmez auprès du CGI avant de vous déplacer.',
          ],
        },
      ],
    },
  ],
  // Reprises mot pour mot de la section « Questions fréquentes » : le
  // `FAQPage` doit déclarer ce que le lecteur voit, et la seule façon de le
  // garantir est de n'avoir qu'une liste. Les deux dernières entrées sont
  // formulées comme des affirmations et non comme des questions — c'est le
  // texte de l'auteur, laissé tel quel.
  faq: [
    {
      question: 'Est-ce que je peux conduire en attendant ?',
      reponse:
        'Le récépissé de déclaration de perte n’est pas un permis de conduire. [À confirmer auprès du CGI : existe-t-il un document provisoire autorisant la conduite pendant l’instruction du duplicata ?] En cas de contrôle, présentez ce que vous avez et expliquez la situation — mais ne considérez pas que vous êtes couvert.',
    },
    {
      question: 'Combien de temps ça prend ?',
      // La phrase de l'auteur est gardée intacte ; seul « le CGI » devient
      // cliquable, pour qu'un lecteur au volant appelle sans recopier dix
      // chiffres. Aucun mot ajouté, aucun retiré.
      reponse: [
        'Cela dépend de l’affluence. Appelez ',
        { texte: 'le CGI', href: 'tel:+2252722479560' },
        ' pour l’estimation du moment.',
      ],
    },
    {
      question: 'Mon permis a été retrouvé après le dépôt du dossier.',
      reponse:
        'Signalez-le au CGI. Deux permis valides en circulation au même nom, c’est un problème pour vous.',
    },
    {
      question: 'Quelqu’un réclame de l’argent pour me le rendre.',
      reponse:
        'Ne payez pas et ne vous rendez pas seul à un rendez-vous privé. Rendre un document trouvé est gratuit. Signalez la situation au commissariat le plus proche.',
    },
  ],
  // `permis-conduire-perdu` est le guide déjà en ligne sur le même sujet. Le
  // citer ici ne tient que tant que ce brouillon reste un brouillon : le jour
  // de la publication, les deux pages se disputeraient la même requête, et il
  // faudra trancher — fusion ou redirection — avant de retirer `brouillon`.
  connexes: ['permis-conduire-perdu', 'carte-grise-perdue', 'cni-perdue-que-faire'],
};

/** Les brouillons, dans l'ordre où ils attendent leur feu vert. */
export const BROUILLONS: Guide[] = [permisBrouillon];
