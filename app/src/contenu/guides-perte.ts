import type { Guide } from './types';


/**
 * Guide « CNI perdue », version fusionnée.
 *
 * L'article rédigé le 16 septembre apportait la procédure administrative
 * complète — vérification préalable, déclaration de perte, timbre, dossier,
 * suivi — là où le guide en ligne s'arrêtait aux premiers réflexes. Les deux
 * ont été réunis ici plutôt que publiés côte à côte : deux pages sur « j'ai
 * perdu ma CNI » se seraient disputé la même requête et se seraient affaiblies
 * mutuellement. L'adresse historique est donc conservée, et celle annoncée
 * dans le brief devient un `alias` qui redirige.
 *
 * Deux règles de fond commandent la rédaction, et aucune n'est négociable :
 *
 * - Aucun montant, nulle part. Les sources se contredisent, les tarifs
 *   bougent, et un chiffre périmé sur Internet envoie quelqu'un faire la queue
 *   avec la mauvaise somme. On renvoie vers rnpp.ci et vers le 1340, qui ont la
 *   version du jour.
 * - L'office est cité pour ce qui vient APRÈS la recherche, et seulement pour
 *   ça : les pièces du dossier, le timbre sur rnpp.ci, le suivi sur
 *   statut.oneci.ci, le 1340. Un guide sur le duplicata qui cache où acheter le
 *   timbre ou où se trouve le centre d'enrôlement n'est pas un guide. Son
 *   service de recherche des CNI perdues, lui, n'est cité qu'une fois, en
 *   passant, sans bouton — et jamais dans un titre, une adresse, une balise
 *   `title`, une méta-description ou un texte de marque. Une page qui répète le
 *   nom de l'office une douzaine de fois se lit comme son annuaire, et c'est
 *   son site officiel qui gagne cette requête-là, pas nous.
 *
 * Pas d'`avertissement` en tête : contrairement au guide du permis, la
 * procédure décrite ici est celle que l'office publie lui-même. L'encadré est
 * réservé à ce qui n'est pas confirmé.
 */
export const cniPerdue: Guide = {
  slug: 'cni-perdue-que-faire',
  /**
   * Le titre ne dit plus « CNI », et c'est l'export Search Console qui l'a
   * tranché : sur 46 impressions, cette page sortait à la position 13,7 — page
   * 2. Les requêtes qui l'appellent sont « j'ai perdu ma carte d'identité
   * ivoirienne », « pièce d'identité perdue », « j'ai perdue ma carte
   * d'identité ». Aucune ne contient le sigle. L'adresse, elle, ne bouge pas :
   * elle est indexée, et on ne renomme pas une URL qui marche.
   */
  titre: 'Carte d’identité perdue en Côte d’Ivoire : que faire',
  description:
    'J’ai perdu ma carte d’identité ivoirienne : les gestes des premières heures, comment la retrouver avant de payer, et le duplicata étape par étape.',
  chapo:
    'Perdre sa pièce d’identité, c’est perdre l’accès à presque tout : la banque, les démarches, parfois le travail. Avant de vous lancer dans une refabrication, sachez qu’une carte perdue est très souvent une carte ramassée. Voici la marche à suivre, dans l’ordre.',
  miseAJour: '2026-09-17',
  question: 'J’ai perdu ma carte d’identité, que dois-je faire ?',
  /**
   * L'ordre des sections suit celui des besoins du lecteur, pas celui de la
   * rédaction : on vérifie d'abord que la carte n'a pas déjà été ramassée —
   * c'est l'étape qui peut lui épargner tout le reste —, puis on déroule le
   * duplicata dans l'ordre réel des guichets, et la restitution ne vient qu'à
   * la fin, quand la recherche a abouti.
   */
  sections: [
    {
      titre: 'Les trois premières heures comptent',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Une pièce d’identité tombée est rarement volée. Elle glisse d’une poche dans un taxi, reste sur un comptoir, se perd dans un gbaka. Dans la plupart des cas, quelqu’un la ramasse — et ne sait pas quoi en faire.',
        },
        {
          type: 'etapes',
          items: [
            {
              titre: 'Refaites le trajet dans votre tête',
              texte:
                'Quel a été le dernier endroit où vous l’avez sortie ? Une banque, un contrôle, une boutique, un guichet. Appelez ou repassez : les commerces gardent souvent les pièces trouvées derrière le comptoir.',
            },
            {
              titre: 'Déclarez la perte au commissariat',
              texte:
                'La déclaration de perte est le document qui vous protège si quelqu’un tente d’utiliser votre identité. Faites-la sans attendre, même si vous espérez retrouver la pièce.',
            },
            {
              titre: 'Créez une alerte sur Pièci',
              texte:
                'Il suffit de votre nom, du type de pièce et de votre numéro de téléphone. Si quelqu’un a déjà déclaré votre pièce, vous le voyez immédiatement. Sinon, l’alerte reste active et vous êtes prévenu dès qu’elle apparaît.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Vérifier si elle a déjà été retrouvée',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Avant de payer quoi que ce soit, prenez cinq minutes pour vérifier si votre carte n’a pas simplement été ramassée par quelqu’un.',
        },
        {
          type: 'paragraphe',
          texte: [
            'Sur Pièci, vous ',
            { texte: 'créez une alerte avec votre nom', href: '/perdu' },
            '. Dès qu’une pièce correspondante est déclarée, vous êtes prévenu automatiquement. C’est gratuit, ça prend une minute, et vous n’avez pas besoin de connaître votre numéro de pièce : la recherche se fait par le nom.',
          ],
        },
        {
          /**
           * Le service officiel de recherche est cité **une seule fois**, en
           * passant, dans le fil du texte : il ne couvre pas les mêmes
           * trouvailles que nous — les cartes rapportées dans les locaux
           * officiels, pas celles ramassées dans la rue — et le lecteur a le
           * droit de le savoir. Mais pas d'étape à son nom, pas de bouton :
           * une page qui met les deux à parité renvoie son lecteur ailleurs au
           */
          type: 'paragraphe',
          texte: [
            'Les cartes rapportées dans les locaux officiels, elles, ne passent pas par nous : l’ONECI tient son propre ',
            {
              texte: 'service de recherche',
              href: 'https://www.oneci.ci/nos-produits/carte-identite/rechercher-cni-perdue',
            },
            ', qui demande le numéro NNI — celui qui est écrit sur la carte que vous venez justement de perdre.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Ça ne coûte rien et, dans le meilleur des cas, ça vous évite tout le reste de cet article.',
        },
      ],
    },
    {
      titre: 'Pourquoi chercher avant de refaire',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Refaire une pièce demande du temps, des déplacements et des frais. Chercher ne coûte rien et prend deux minutes. Tant que la refabrication n’est pas engagée, la recherche vaut la peine — et elle peut continuer en parallèle.',
        },
        {
          type: 'encadre',
          titre: 'Votre nom suffit',
          texte:
            'Pièci cherche par votre nom, et tolère les variantes d’orthographe : « N’Guessan », « Nguessan » et « N Guessan » mènent au même résultat.',
        },
      ],
    },
    {
      titre: 'La déclaration de perte',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'C’est le document de base : sans lui, aucune demande de duplicata n’est recevable.',
        },
        {
          type: 'paragraphe',
          texte:
            'Rendez-vous au commissariat de police ou à la brigade de gendarmerie la plus proche de chez vous et demandez une attestation de déclaration de perte. Munissez-vous de tout ce qui peut prouver votre identité — un extrait de naissance, une photocopie de votre ancienne carte, un passeport, une attestation de travail.',
        },
        { type: 'paragraphe', texte: 'Deux conseils qui font gagner du temps :' },
        {
          type: 'liste',
          items: [
            'Faites-en faire plusieurs exemplaires ou photocopiez-la tout de suite. Vous en aurez besoin plus d’une fois.',
            'Photographiez-la avec votre téléphone dès que vous l’avez en main. C’est exactement le genre de papier qu’on reperd.',
          ],
        },
      ],
    },
    {
      titre: 'Le timbre d’enrôlement',
      blocs: [
        {
          /**
           * Le lien vers rnpp.ci porte seul l'information tarifaire : le prix
           * s'affiche au moment de l'achat, et c'est la seule valeur qui ne
           * périme pas entre deux relectures de cette page.
           */
          type: 'paragraphe',
          texte: [
            'Le paiement se fait en ligne, sur ',
            { texte: 'rnpp.ci', href: 'https://rnpp.ci' },
            '. Vous achetez votre timbre, vous conservez le reçu : il vous sera demandé au centre.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Achetez le timbre avant de vous déplacer. Se présenter au centre sans reçu, c’est repartir.',
        },
      ],
    },
    {
      titre: 'Le dossier de duplicata',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Selon la ',
            {
              texte: 'liste officielle publiée par l’ONECI',
              href: 'https://www.oneci.ci/nos-produits/carte-identite/documents-a-fournir',
            },
            ', un duplicata de CNI demande :',
          ],
        },
        {
          type: 'liste',
          items: [
            'une attestation de déclaration de perte délivrée par les autorités compétentes ;',
            'une copie recto-verso de la CNI biométrique égarée, ou une fiche d’identité officielle, ou tout autre document portant votre numéro NNI ;',
            'une copie intégrale de l’acte de naissance ou un extrait d’acte de naissance ;',
            'le reçu d’enrôlement.',
          ],
        },
        {
          type: 'paragraphe',
          texte: 'Le reçu de paiement du timbre RNPP est également exigé.',
        },
        {
          /**
           * C'est le point de blocage réel de la démarche, et il tombe au
           * milieu d'une liste administrative où personne ne le remarque.
           * D'où l'encadré : le conseil qui le désamorce ne vaut que s'il est
           * lu *avant* d'en avoir besoin.
           */
          type: 'encadre',
          titre: 'Le piège de la deuxième ligne',
          texte:
            'Il vous faut un document qui porte votre numéro NNI. Si vous n’avez jamais photocopié votre carte et que vous n’avez rien d’autre, c’est là que la démarche se complique. D’où le conseil, valable pour tout le monde : photographiez le recto et le verso de votre CNI aujourd’hui et rangez l’image quelque part où vous la retrouverez.',
        },
        {
          type: 'paragraphe',
          texte: [
            'Présentez-vous ensuite dans le centre d’enrôlement le plus proche de votre domicile ou de votre lieu de travail — voir la ',
            {
              texte: 'liste des centres d’enrôlement',
              href: 'https://www.oneci.ci/nos-produits/carte-identite/liste-centres-enrolement',
            },
            '. Votre présence physique est indispensable : il faut reprendre vos empreintes.',
          ],
        },
        {
          type: 'paragraphe',
          texte: 'Apportez les originaux. L’absence d’originaux entraîne le rejet du dossier.',
        },
      ],
    },
    {
      titre: 'Le suivi et le retrait',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Vous pouvez suivre l’avancement sur ',
            { texte: 'statut.oneci.ci', href: 'https://statut.oneci.ci' },
            '. Si vous avez égaré votre numéro de demande, il existe une page dédiée pour le retrouver.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Pour le retrait, il faut le récépissé d’enrôlement (ou un autre document d’identité) et le message de retrait contenant le numéro ID/BL, reçu par SMS ou consultable sur le site.',
        },
      ],
    },
    {
      titre: 'Comment se passe la restitution',
      blocs: [
        {
          type: 'liste',
          items: [
            'Vous confirmez que la pièce déclarée est bien la vôtre.',
            'La personne qui l’a trouvée confirme de son côté.',
            'Vos numéros s’échangent seulement à ce moment-là, jamais avant.',
            'Vous convenez d’un lieu public pour la remise : mairie, commissariat, pharmacie.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Tant que les deux parties n’ont pas confirmé, aucune coordonnée ne circule. Le registre public n’affiche que le nom de famille et les initiales du prénom, et les photos sont floutées avant publication : le numéro, la date de naissance et la signature restent illisibles.',
        },
      ],
    },
    {
      titre: 'Le réflexe à garder',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Faites votre ',
            { texte: 'alerte de perte', href: '/perdu' },
            ' avant d’engager le duplicata. Ça prend une minute, c’est gratuit, et si votre carte a été ramassée par quelqu’un de bonne volonté, vous le saurez.',
          ],
        },
        {
          type: 'paragraphe',
          texte: [
            'Et si c’est vous qui trouvez une pièce un jour : ',
            { texte: 'déclarez-la', href: '/declarer' },
            '. C’est la même minute, de l’autre côté.',
          ],
        },
        {
          /**
           * La mention des sources et de leur péremption ferme l'article : sur
           * une démarche administrative, dire où l'on a lu ce qu'on affirme et
           * admettre que cela peut avoir changé vaut mieux qu'une assurance
           * qui se révélerait fausse au guichet.
           */
          type: 'paragraphe',
          texte: [
            'Les procédures administratives évoluent : en cas de doute, appelez le ',
            { texte: '1340', href: 'tel:1340' },
            '.',
          ],
        },
      ],
    },
  ],
  /**
   * Les questions fréquentes de l'article ne deviennent pas une section mais
   * ce tableau : c'est lui qui alimente à la fois le texte affiché et le
   * `FAQPage`. Les formulations sont reprises mot pour mot, y compris le refus
   * assumé d'afficher un montant — c'est une réponse en soi, et c'est la seule
   * qui reste vraie dans six mois.
   */
  faq: [
    {
      question: 'Combien ça coûte ?',
      reponse: [
        'Le montant du timbre est indiqué au moment de l’achat sur rnpp.ci. Nous préférons ne pas afficher un chiffre ici : les tarifs changent, et une somme périmée sur Internet fait perdre du temps à tout le monde. Vérifiez directement sur ',
        { texte: 'rnpp.ci', href: 'https://rnpp.ci' },
        ' ou appelez le ',
        { texte: '1340', href: 'tel:1340' },
        '.',
      ],
    },
    {
      question: 'Combien de temps ça prend ?',
      reponse: [
        'Les délais varient selon l’affluence du centre. Le call center officiel (',
        { texte: '1340', href: 'tel:1340' },
        ', du lundi au vendredi de 7h à 17h, le samedi de 8h à 16h) vous donnera l’estimation du moment.',
      ],
    },
    {
      question: 'Ma carte a été retrouvée après que j’ai lancé le duplicata. Que faire ?',
      reponse:
        'Signalez-le. Une carte qui circule alors qu’un duplicata existe, c’est un risque d’usurpation d’identité pour vous.',
    },
    {
      question: 'Quelqu’un me demande de l’argent pour me rendre ma pièce.',
      reponse:
        'Ne payez pas, et ne vous déplacez pas seul dans un lieu privé. Une pièce retrouvée se rend gratuitement. Si la personne insiste, signalez-le au commissariat le plus proche. C’est précisément pour éviter ça que Pièci n’affiche jamais le numéro de la pièce et organise la remise dans un lieu officiel.',
    },
  ],
  /**
   * L'adresse annoncée dans le brief éditorial. Elle redirige vers `slug`
   * plutôt que de devenir une seconde page : le brief a circulé, l'URL a pu
   * être notée ailleurs, et une redirection coûte moins cher qu'un doublon.
   */
  alias: ['perdre-sa-carte-nationale-identite'],
  connexes: ['cni-perdue-sans-numero', 'cni-volee-que-faire', 'j-ai-trouve-une-cni'],
};

export const cniPerdueSansNumero: Guide = {
  slug: 'cni-perdue-sans-numero',
  titre: 'Retrouver sa CNI sans connaître son numéro',
  description:
    'Impossible de chercher votre pièce parce qu’on vous demande un numéro que vous n’avez plus ? Voici comment la retrouver à partir de votre seul nom.',
  chapo:
    'C’est la contradiction la plus frustrante des démarches : pour retrouver la pièce que vous avez perdue, on vous réclame le numéro qui était écrit dessus.',
  miseAJour: '2026-08-24',
  question: 'Comment chercher une CNI perdue sans le numéro ?',
  sections: [
    {
      titre: 'Le problème, posé simplement',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Presque personne ne connaît par cœur le numéro de sa carte d’identité. On ne l’apprend pas, on ne le note pas — il est sur la carte, et c’est bien pour ça qu’on ne s’en souvient plus quand la carte disparaît.',
        },
        {
          type: 'paragraphe',
          texte:
            'Un formulaire de recherche qui exige ce numéro écarte donc exactement les personnes qu’il devrait aider. Celles qui l’ont noté quelque part n’ont généralement pas besoin d’aide ; les autres restent à la porte.',
        },
      ],
    },
    {
      titre: 'Chercher par le nom, avec tolérance aux fautes',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Pièci part de ce que vous avez toujours : votre nom et votre prénom. Aucun numéro n’est demandé, ni pour chercher, ni pour créer une alerte.',
        },
        {
          type: 'paragraphe',
          texte:
            'Les noms ivoiriens s’écrivent de plusieurs façons selon les documents et selon qui les saisit. L’algorithme en tient compte : il rapproche les orthographes voisines au lieu d’exiger une correspondance exacte.',
        },
        {
          type: 'tableau',
          entetes: ['Vous écrivez', 'Le registre contient', 'Résultat'],
          lignes: [
            ['Nguessan', 'N’Guessan', 'Rapproché'],
            ['Kouassy', 'Kouassi', 'Rapproché'],
            ['Aya Konan', 'Konan Aya', 'Rapproché'],
          ],
        },
      ],
    },
    {
      titre: 'Ce qu’il vous faut, en tout',
      blocs: [
        {
          type: 'liste',
          items: [
            'Votre nom et votre prénom, tels qu’ils figurent sur la pièce.',
            'Le type de pièce perdue.',
            'Votre numéro de téléphone, pour être prévenu.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Et si rien ne sort aujourd’hui',
          texte:
            'L’alerte reste active. Le jour où quelqu’un déclare une pièce à votre nom, vous êtes prévenu — même des semaines plus tard. Beaucoup de pièces sont ramassées bien avant d’être déclarées.',
        },
      ],
    },
  ],
  connexes: ['cni-perdue-que-faire', 'j-ai-trouve-une-cni'],
};

/**
 * « J’ai trouvé une pièce d’identité ». Version fusionnée : l’article du
 * 16 septembre 2026 et le guide déjà en ligne répondent à la même question,
 * posée dans les mêmes mots. Deux pages se seraient disputé la requête et se
 * seraient affaiblies l’une l’autre ; il n’y en a donc qu’une.
 *
 * L’adresse ne bouge pas : /guides/j-ai-trouve-une-cni est déjà indexée et
 * liée depuis trois autres guides. L’adresse annoncée dans le brief devient
 * un `alias` qui redirige — une page annoncée ailleurs doit mener quelque
 * part, pas devenir une jumelle.
 *
 * Ce que l’article apporte et qui manquait : les trois raisons pour
 * lesquelles le statut WhatsApp échoue, le risque d’usurpation quand une
 * pièce circule en clair, le dépôt en lieu officiel, le modèle de message à
 * faire circuler, et les 90 jours. Ce que le guide garde :
 * ce que vit le propriétaire, les trois gestes de la déclaration, et la
 * réponse à la peur qui retient le plus de gens — « est-ce que je risque
 * quelque chose ? ».
 *
 * Règle d’écriture inchangée : aucun montant nulle part, les sources se
 * contredisent et un chiffre faux envoie quelqu’un faire la queue pour rien.
 * Et le service officiel de déclaration d’une CNI retrouvée ne figure pas ici :
 * celui qui vient de ramasser une pièce a un geste à faire, un seul, et c’est
 * la déclarer. Lui en proposer deux à parité, c’est n’en obtenir aucun.
 */
export const jaiTrouveUneCni: Guide = {
  slug: 'j-ai-trouve-une-cni',
  /**
   * L’ancien slug parle de CNI, l’article parle de pièce d’identité — permis
   * et passeport compris, et c’est ainsi que la question se tape. Le titre
   * s’élargit, l’adresse reste : refaire l’URL coûterait l’antériorité
   * acquise et les liens entrants pour un gain de mots-clés nul.
   */
  alias: ['j-ai-trouve-une-piece-identite'],
  titre: 'J’ai trouvé une pièce d’identité : que faire ?',
  description:
    'Vous avez ramassé une pièce d’identité dans la rue, un taxi ou un gbaka ? Voici comment rendre service à son propriétaire en quelques minutes, sans risque.',
  chapo:
    'Vous avez ramassé une carte d’identité, un permis, un passeport. Vous voulez le rendre — et vous ne savez pas comment. C’est le cas de la plupart des gens, et c’est pour ça que tant de pièces ne reviennent jamais à leur propriétaire.',
  miseAJour: '2026-09-17',
  question: 'J’ai trouvé une pièce d’identité, comment retrouver son propriétaire ?',
  sections: [
    {
      titre: 'Ce que vit la personne en face',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Sans sa pièce, elle ne peut ni retirer d’argent, ni signer, ni parfois travailler. La refaire lui coûtera des jours de démarches. Votre geste lui évite tout ça.',
        },
      ],
    },
    {
      /**
       * Cette section vient avant les conseils, et pas après : le lecteur a
       * déjà son téléphone en main et son statut à moitié rédigé. Lui dire
       * quoi faire sans lui dire d’abord pourquoi son réflexe échoue, c’est
       * parler après la bataille.
       */
      titre: 'Le réflexe habituel, et pourquoi il échoue',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le réflexe, c’est la photo en statut WhatsApp. Ça part d’une bonne intention, mais ça ne marche presque jamais, pour trois raisons :',
        },
        {
          type: 'liste',
          items: [
            'Le statut disparaît en 24 heures. Si le propriétaire ne le voit pas dans la journée, c’est fini.',
            'Ça ne touche que vos contacts. Or le propriétaire n’est pas dans votre répertoire — sinon vous l’auriez appelé.',
            'La personne qui cherche n’a nulle part où chercher. Elle ne peut pas fouiller les statuts de gens qu’elle ne connaît pas. Tout repose sur le hasard.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Et il y a un risque que peu de gens mesurent : une pièce d’identité photographiée en clair et repartagée est une usurpation d’identité qui se prépare. Le numéro, la date de naissance, la photo, tout est lisible. Des cas de demandes de rançon contre restitution ont été signalés.',
        },
        {
          /**
           * Formulé en conseil et non en interdiction : celui qui va publier
           * quand même ne s’arrêtera pas parce qu’on le lui défend, alors
           * autant qu’il masque le numéro.
           */
          type: 'encadre',
          titre: 'Si vous publiez malgré tout',
          texte: 'Masquez le numéro avant d’envoyer.',
        },
      ],
    },
    {
      /**
       * Le titre existant est conservé : c’est une ancre déjà en ligne, et
       * « deux minutes » est la promesse qui décide le lecteur à commencer.
       * Les trois gestes de l’ancien guide disent *comment* on déclare ;
       * l’article dit *ce qui se passe ensuite* et *ce qui est protégé*. Les
       * deux manquaient l’un à l’autre.
       */
      titre: 'La déclarer prend deux minutes',
      blocs: [
        {
          type: 'paragraphe',
          texte: [
            'Sur ',
            { texte: 'pieci.ci/declarer', href: '/declarer' },
            ' : une photo, le type de document, le quartier où vous l’avez trouvée. Moins d’une minute.',
          ],
        },
        {
          type: 'etapes',
          items: [
            {
              titre: 'Photographiez le recto',
              texte:
                'Une seule photo suffit. Le numéro, la date de naissance et la signature sont floutés automatiquement par le serveur avant toute publication : personne ne peut y lire quoi que ce soit.',
            },
            {
              titre: 'Indiquez le nom et le lieu',
              texte:
                'Le prénom et le nom inscrits sur la pièce, la commune, et le quartier si vous le connaissez. Plus c’est précis, plus vite le propriétaire se reconnaît.',
            },
            {
              titre: 'Laissez votre numéro',
              texte:
                'Il ne sera jamais publié. Il ne parvient au propriétaire que si vous confirmez tous les deux la correspondance.',
            },
          ],
        },
        {
          /**
           * « une alerte » pointe vers /perdu : c’est le seul endroit de
           * l’article où le lecteur croise le geste symétrique du sien, et
           * beaucoup de gens qui trouvent une pièce ont aussi perdu la leur.
           */
          type: 'paragraphe',
          texte: [
            'Ce qui se passe ensuite est automatique : si le propriétaire a créé ',
            { texte: 'une alerte', href: '/perdu' },
            ', il est prévenu. Sinon, sa pièce est enregistrée et cherchable par son nom — le jour où lui, ou quelqu’un qui le connaît, fera la recherche.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Vos données et les siennes sont protégées : le numéro de la pièce n’est jamais affiché, la photo est floutée automatiquement, et en public on ne voit que le nom de famille, l’initiale du prénom, le type de document et la commune. Votre numéro à vous n’est jamais publié non plus — il ne circule qu’après confirmation des deux côtés.',
        },
        {
          type: 'paragraphe',
          texte:
            'C’est gratuit, sans inscription compliquée, et ça marche depuis le navigateur du téléphone.',
        },
      ],
    },
    {
      titre: 'Déposez-la dans un lieu sûr',
      blocs: [
        {
          type: 'paragraphe',
          texte: 'C’est le point le plus important, et celui qu’on néglige.',
        },
        {
          type: 'paragraphe',
          texte:
            'Déposez la pièce au commissariat, à la gendarmerie ou à la mairie de la commune. C’est ce que prévoit la loi, et surtout ça vous protège : vous n’avez plus le document sur vous, vous n’avez pas à rencontrer un inconnu, et le propriétaire le récupère dans un endroit où l’on vérifie son identité.',
        },
        {
          /**
           * En encadré parce que c’est le geste que tout le monde a déjà vu
           * faire et croit bon : il faut qu’il saute aux yeux de celui qui
           * parcourt la page sans la lire.
           */
          type: 'encadre',
          titre: 'Jamais sur un poteau',
          texte:
            'Ne laissez jamais une pièce accrochée sur un poteau ou un panneau. C’est fréquent et bien intentionné, mais le document disparaît, se mouille, ou est ramassé par quelqu’un d’autre. Si vous l’avez trouvée comme ça, le mieux est de la prendre et de la déposer correctement.',
        },
      ],
    },
    {
      titre: 'Si vous partagez, partagez utile',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Une fois la pièce déclarée, Pièci vous donne un lien à faire circuler. Mettez le nom de famille en premier dans votre message : c’est ce que les gens reconnaissent en faisant défiler.',
        },
        {
          /**
           * Un encadré et non une liste : ce bloc n’énumère rien, c’est un
           * message à recopier tel quel. Rendu en puces, chaque ligne
           * deviendrait un conseil séparé et le lecteur ne verrait plus qu’il
           * peut simplement le copier. Les retours à la ligne du modèle
           * d’origine se perdent ici — le modèle de contenu n’a pas de bloc
           * « citation » ; si la mise en forme compte, c’est un type de bloc
           * à ajouter, pas une liste à détourner.
           */
          type: 'encadre',
          titre: 'Le message à faire circuler',
          texte:
            'N’GUESSAN A. Si tu connais ce nom, préviens la personne : sa carte d’identité a été retrouvée à Yopougon. Elle est enregistrée sur Pièci, la récupération est gratuite et aucun numéro n’est publié. pieci.ci/piece/…',
        },
        {
          type: 'paragraphe',
          texte:
            'Un nom circule plus vite qu’une recherche. C’est comme ça que la plupart des pièces retrouvent leur propriétaire.',
        },
      ],
    },
    {
      titre: 'Vous ne prenez aucun risque',
      blocs: [
        {
          type: 'liste',
          items: [
            'Votre numéro reste privé jusqu’à confirmation des deux côtés.',
            'Le registre public n’affiche que le nom de famille et les initiales du prénom du propriétaire.',
            'Vous n’êtes jamais obligé de rencontrer qui que ce soit chez vous.',
            'Vous pouvez déposer la pièce dans un lieu sûr et ne plus vous en occuper.',
          ],
        },
      ],
    },
    {
      /**
       * Une liste et non des étapes : ce sont quatre interdits indépendants,
       * dans aucun ordre. Numérotés, ils suggéreraient une marche à suivre.
       */
      titre: 'Ce qu’il ne faut pas faire',
      blocs: [
        {
          type: 'liste',
          items: [
            'Ne demandez jamais d’argent. Rendre une pièce trouvée est un geste gratuit. Réclamer une récompense pour restituer un document d’identité est une pratique condamnable, et de toute façon, ce n’est pas ce que vous avez en tête si vous lisez cette page.',
            'N’acceptez pas de payer si quelqu’un d’autre vous met la pression pour récupérer la pièce que vous avez trouvée.',
            'Ne fixez pas de rendez-vous privé avec un inconnu pour la remise. Passez par un lieu officiel. C’est aussi simple, et personne ne prend de risque.',
            'Ne gardez pas la pièce chez vous des semaines. Plus elle reste dans un tiroir, moins elle a de chances de revenir.',
          ],
        },
      ],
    },
    {
      titre: 'Et si personne ne vient ?',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Vous avez fait votre part. La pièce est déposée dans un lieu officiel, elle est déclarée, elle est cherchable. Le reste ne dépend plus de vous.',
        },
        {
          type: 'paragraphe',
          texte:
            'Sur Pièci, une déclaration reste active 90 jours. C’est largement le temps qu’il faut à quelqu’un pour se rendre compte de sa perte et chercher.',
        },
      ],
    },
    {
      /**
       * La page se termine sur le propriétaire, pas sur le service : c’est ce
       * qui décide le lecteur à finir la démarche, et c’est vrai.
       */
      titre: 'Une minute de votre temps',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Ce n’est pas grand-chose — une photo, un quartier, un dépôt en passant. Mais pour la personne en face, c’est un duplicata évité, des démarches en moins, et parfois bien plus : sans pièce d’identité, on ne retire pas d’argent, on ne passe pas un examen, on ne voyage pas.',
        },
        {
          /**
           * L’appel à l’action de l’article, gardé en lien de texte. La
           * flèche « → » du Markdown disparaît : le rendu des liens du site
           * porte déjà cette affordance, et le bloc de boutons de fin
           * d’article vient ensuite.
           */
          type: 'paragraphe',
          texte: [{ texte: 'Déclarer une pièce trouvée', href: '/declarer' }],
        },
      ],
    },
  ],
  /**
   * Ces quatre questions étaient une section « Les questions que tout le monde
   * se pose », rendue en étapes — un bloc numéroté pour des questions qui ne
   * se suivent pas. Déplacées ici mot pour mot, elles alimentent en plus le
   * `FAQPage` : même texte affiché et déclaré, aucune divergence possible. La
   * section d’origine est supprimée, sans quoi la page poserait deux fois les
   * mêmes questions.
   */
  faq: [
    {
      question: 'Est-ce que je risque quelque chose en la gardant ?',
      reponse:
        'Non. Ramasser un document et chercher à le rendre n’a rien de répréhensible. Ce qui poserait problème, ce serait de l’utiliser ou de le monnayer — pas de le garder le temps de retrouver son propriétaire.',
    },
    {
      question: 'Et si la photo ne ressemble pas à la personne qui vient ?',
      reponse:
        'Ne remettez rien si vous avez un doute. Déposez la pièce au commissariat ou à la mairie et indiquez-le : le contrôle se fera là-bas, et ce n’est pas à vous de trancher.',
    },
    {
      question: 'Combien de temps garder la pièce ?',
      reponse:
        'Aussi longtemps que ça ne vous pèse pas. Beaucoup de propriétaires ne créent leur alerte qu’au bout d’une ou deux semaines, quand ils ont fini de chercher chez eux.',
    },
    {
      question: 'Est-ce que mon numéro sera visible ?',
      reponse:
        'Jamais. Il ne parvient au propriétaire qu’après confirmation des deux côtés, et il n’apparaît nulle part sur le registre public.',
    },
  ],
  connexes: ['ou-deposer-piece-trouvee', 'cni-perdue-que-faire', 'recompense-piece-trouvee'],
};
