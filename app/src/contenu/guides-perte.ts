import type { Guide } from './types';

/**
 * Guides « j'ai perdu ». Intention de détresse : la personne vient de
 * s'apercevoir de la perte et tape sa question telle quelle dans Google.
 *
 * Règle d'écriture : aucun montant, aucun délai, aucune liste de pièces à
 * fournir inventés. Ces informations évoluent et une erreur enverrait
 * quelqu'un faire la queue pour rien. Quand on ne sait pas, on renvoie au
 * service compétent sans prétendre le contraire.
 */

export const cniPerdue: Guide = {
  slug: 'cni-perdue-que-faire',
  titre: 'CNI perdue en Côte d’Ivoire : que faire, dans l’ordre',
  description:
    'Vous avez perdu votre carte nationale d’identité ? Voici les gestes à faire dans les premières heures, et comment la retrouver si quelqu’un l’a ramassée.',
  chapo:
    'Perdre sa pièce d’identité, c’est perdre l’accès à presque tout : la banque, les démarches, parfois le travail. Avant de vous lancer dans une refabrication, sachez qu’une carte perdue est très souvent une carte ramassée.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma CNI, que dois-je faire ?',
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
      titre: 'Pourquoi chercher avant de refaire',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Refaire une pièce demande du temps, des déplacements et des frais. Chercher ne coûte rien et prend deux minutes. Tant que la refabrication n’est pas engagée, la recherche vaut la peine — et elle peut continuer en parallèle.',
        },
        {
          type: 'encadre',
          titre: 'Le piège du numéro',
          texte:
            'La plupart des services de recherche vous demandent le numéro inscrit sur la pièce. Or ce numéro, vous l’avez perdu avec elle. Pièci cherche par votre nom, et tolère les variantes d’orthographe : « N’Guessan », « Nguessan » et « N Guessan » mènent au même résultat.',
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
            'Tant que les deux parties n’ont pas confirmé, aucune coordonnée ne circule. Le registre public n’affiche que le prénom et l’initiale du nom, et les photos sont floutées avant publication : le numéro, la date de naissance et la signature restent illisibles.',
        },
      ],
    },
  ],
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

export const jaiTrouveUneCni: Guide = {
  slug: 'j-ai-trouve-une-cni',
  titre: 'J’ai trouvé une carte d’identité : que faire ?',
  description:
    'Vous avez ramassé une pièce d’identité dans la rue, un taxi ou un gbaka ? Voici comment rendre service à son propriétaire en quelques minutes, sans risque.',
  chapo:
    'Vous tenez entre les mains le document qui manque cruellement à quelqu’un en ce moment même. Le rendre est plus simple que vous ne le pensez.',
  miseAJour: '2026-08-24',
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
      titre: 'La déclarer prend deux minutes',
      blocs: [
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
      ],
    },
    {
      titre: 'Vous ne prenez aucun risque',
      blocs: [
        {
          type: 'liste',
          items: [
            'Votre numéro reste privé jusqu’à confirmation des deux côtés.',
            'Le registre public n’affiche que le prénom et l’initiale du nom du propriétaire.',
            'Vous n’êtes jamais obligé de rencontrer qui que ce soit chez vous.',
            'Vous pouvez déposer la pièce dans un lieu sûr et ne plus vous en occuper.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Vous préférez ne pas la garder ?',
          texte:
            'Déposez-la dans une mairie, un commissariat ou une pharmacie, et indiquez ce lieu au moment de la déclaration. Le propriétaire ira la récupérer là-bas. Vous n’avez plus rien à faire.',
        },
      ],
    },
    {
      titre: 'Les questions que tout le monde se pose',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Est-ce que je risque quelque chose en la gardant ?',
              texte:
                'Non. Ramasser un document et chercher à le rendre n’a rien de répréhensible. Ce qui poserait problème, ce serait de l’utiliser ou de le monnayer — pas de le garder le temps de retrouver son propriétaire.',
            },
            {
              titre: 'Et si la photo ne ressemble pas à la personne qui vient ?',
              texte:
                'Ne remettez rien si vous avez un doute. Déposez la pièce au commissariat ou à la mairie et indiquez-le : le contrôle se fera là-bas, et ce n’est pas à vous de trancher.',
            },
            {
              titre: 'Combien de temps garder la pièce ?',
              texte:
                'Aussi longtemps que ça ne vous pèse pas. Beaucoup de propriétaires ne créent leur alerte qu’au bout d’une ou deux semaines, quand ils ont fini de chercher chez eux.',
            },
            {
              titre: 'Est-ce que mon numéro sera visible ?',
              texte:
                'Jamais. Il ne parvient au propriétaire qu’après confirmation des deux côtés, et il n’apparaît nulle part sur le registre public.',
            },
          ],
        },
      ],
    },
  ],
  connexes: ['ou-deposer-piece-trouvee', 'cni-perdue-que-faire', 'recompense-piece-trouvee'],
};