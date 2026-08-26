import type { Guide } from './types';

/**
 * Guides « j'ai trouvé ».
 *
 * C'est le terrain que personne ne travaille : tous les services existants
 * s'adressent à celui qui a perdu. Or la restitution commence toujours par
 * celui qui a ramassé — et lui, aujourd'hui, ne sait pas quoi faire du
 * document qu'il a dans la main.
 */

export const ouDeposerPieceTrouvee: Guide = {
  slug: 'ou-deposer-piece-trouvee',
  titre: 'Où déposer une pièce d’identité trouvée ?',
  description:
    'Mairie, commissariat, pharmacie, réseaux sociaux : ce qui marche vraiment quand on a ramassé une pièce d’identité, et ce qui la fait disparaître.',
  chapo:
    'Vous voulez bien faire, mais vous ne savez pas où l’apporter — ni si elle arrivera vraiment à son propriétaire. Voici ce que valent les différentes options.',
  miseAJour: '2026-08-24',
  question: 'Où déposer une pièce d’identité que j’ai trouvée ?',
  sections: [
    {
      titre: 'Ce que valent les différentes options',
      blocs: [
        {
          type: 'tableau',
          entetes: ['Option', 'Ce qui se passe', 'Chance de restitution'],
          lignes: [
            [
              'Commissariat',
              'La pièce est conservée en lieu sûr et enregistrée.',
              'Bonne, si le propriétaire pense à s’y présenter.',
            ],
            [
              'Mairie',
              'Souvent un registre d’objets trouvés, tenu à l’accueil.',
              'Bonne, mais seulement pour qui habite la commune.',
            ],
            [
              'Statut WhatsApp',
              'Vu par vos contacts pendant 24 h, puis effacé.',
              'Faible : le propriétaire n’est presque jamais dans votre liste.',
            ],
            [
              'Groupe Facebook',
              'Noyé sous les publications en quelques heures.',
              'Faible, sauf coup de chance.',
            ],
            [
              'Pièci',
              'Enregistrée durablement, et rapprochée automatiquement.',
              'Élevée : c’est le propriétaire qui est prévenu, pas l’inverse.',
            ],
          ],
        },
      ],
    },
    {
      titre: 'Le problème commun à toutes les options physiques',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Déposer la pièce quelque part la met à l’abri, mais ne prévient personne. Le propriétaire doit deviner où aller — et il n’ira que s’il pense à la bonne mairie, au bon commissariat, le bon jour.',
        },
        {
          type: 'paragraphe',
          texte:
            'C’est exactement ce que la déclaration en ligne corrige. Elle ne remplace pas le dépôt : elle lui donne une adresse. Vous déposez la pièce là où c’est pratique pour vous, vous l’indiquez, et le propriétaire sait où venir.',
        },
        {
          type: 'encadre',
          titre: 'La combinaison qui marche le mieux',
          texte:
            'Déclarez la pièce sur Pièci, puis déposez-la à la mairie ou au commissariat de la commune où vous l’avez trouvée, en précisant ce lieu dans la déclaration. Vous êtes déchargé, et le propriétaire est prévenu avec l’adresse exacte.',
        },
      ],
    },
    {
      titre: 'Si vous préférez la garder',
      blocs: [
        {
          type: 'liste',
          items: [
            'Rangez-la à plat, à l’abri de l’humidité — une pièce abîmée peut devenir inutilisable.',
            'Ne la photographiez pas pour la publier telle quelle : le numéro et la date de naissance suffisent à monter une usurpation.',
            'Convenez d’un lieu public pour la remise, jamais de votre domicile.',
          ],
        },
      ],
    },
  ],
  connexes: ['j-ai-trouve-une-cni', 'recompense-piece-trouvee', 'trouve-piece-dans-taxi'],
};

export const recompensePieceTrouvee: Guide = {
  slug: 'recompense-piece-trouvee',
  titre: 'Peut-on demander une récompense pour une pièce trouvée ?',
  description:
    'La question que tout le monde se pose sans oser la poser. Ce qui se fait, ce qui se dit, et pourquoi la gratuité protège tout le monde.',
  chapo:
    'Vous avez rendu service, vous vous êtes déplacé, vous y avez passé du temps. Est-il légitime de demander quelque chose ? Parlons-en franchement.',
  miseAJour: '2026-08-24',
  question: 'Ai-je le droit de demander de l’argent pour rendre une pièce trouvée ?',
  sections: [
    {
      titre: 'Ce qui se pratique',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Beaucoup de propriétaires offrent spontanément quelque chose : de quoi couvrir le transport, ou un geste de remerciement. C’est courant, et personne n’y trouve à redire quand ça vient d’eux.',
        },
        {
          type: 'paragraphe',
          texte:
            'Ce qui change tout, c’est le sens dans lequel la demande part. Un remerciement offert est un remerciement. Une somme réclamée avant restitution est autre chose — et c’est là que ça devient un problème, y compris pour vous.',
        },
      ],
    },
    {
      titre: 'Pourquoi réclamer se retourne contre vous',
      blocs: [
        {
          type: 'liste',
          items: [
            'La personne en face vient de perdre ses papiers : elle est déjà en difficulté, souvent sans argent disponible.',
            'Conditionner la remise à un paiement transforme un service en pression, et vous expose.',
            'La confiance se casse : beaucoup préfèrent alors refaire la pièce plutôt que traiter avec vous.',
          ],
        },
        {
          type: 'encadre',
          titre: 'La règle de Pièci',
          texte:
            'Le service est gratuit et ne prélève rien. Aucun paiement ne transite par la plateforme, dans aucun sens. Ce qui se passe ensuite entre deux personnes ne nous regarde pas — mais nous ne mettrons jamais un prix sur une restitution.',
        },
      ],
    },
    {
      titre: 'Si c’est vous qu’on rançonne',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'La situation inverse existe aussi : vous avez perdu votre pièce, quelqu’un vous appelle et réclame une somme avant de vous la rendre. Vous n’êtes pas obligé de céder, et vous avez plusieurs cartes en main.',
        },
        {
          type: 'liste',
          items: [
            'Ne payez jamais à l’avance, ni par transfert : rien ne garantit la remise.',
            'Proposez un lieu public — mairie, commissariat, pharmacie. Un interlocuteur de bonne foi accepte sans difficulté.',
            'Un refus catégorique de tout lieu public vous dit ce que vous devez savoir.',
            'Continuez la démarche de renouvellement en parallèle : ne restez pas suspendu à cet appel.',
          ],
        },
      ],
    },
    {
      titre: 'Ce que vous y gagnez vraiment',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Rien de monnayable, et c’est très bien ainsi. Vous avez épargné à quelqu’un des semaines de démarches. En Côte d’Ivoire, ce genre de geste circule : il revient rarement de la même personne, presque toujours d’une autre.',
        },
        {
          type: 'paragraphe',
          texte:
            'C’est aussi ce qui fait tenir un registre comme celui-ci. Il ne fonctionne que parce que des gens y déposent une information sans rien attendre en retour. Le jour où chaque restitution aurait un prix, plus personne ne déclarerait rien.',
        },
      ],
    },
  ],
  connexes: ['j-ai-trouve-une-cni', 'ou-deposer-piece-trouvee'],
};

export const trouvePieceDansTaxi: Guide = {
  slug: 'trouve-piece-dans-taxi',
  titre: 'Pièce trouvée dans un taxi, un gbaka ou un woro-woro',
  description:
    'Les transports sont le premier lieu de perte de pièces d’identité. Que faire quand vous en ramassez une sur un siège, et que le passager est déjà loin.',
  chapo:
    'Le siège arrière d’un taxi est probablement l’endroit où le plus de pièces d’identité changent de propriétaire sans le vouloir. On s’assoit, on se relève, le portefeuille s’allège.',
  miseAJour: '2026-08-24',
  question: 'J’ai trouvé une pièce d’identité dans un taxi, que faire ?',
  sections: [
    {
      titre: 'Pourquoi c’est arrivé là',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Position assise, poche arrière, secousses, descente précipitée : la pièce glisse entre le dossier et l’assise, ou tombe au sol sans un bruit. Le passager ne s’en apercevra que des heures plus tard, souvent le lendemain.',
        },
        {
          type: 'paragraphe',
          texte:
            'Ce décalage est justement ce qui rend la restitution difficile. Quand il réalise, il ne sait plus quel taxi, ni quel trajet. Vous, vous avez le document.',
        },
      ],
    },
    {
      titre: 'Ce qu’il faut faire',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Signalez-le au chauffeur, mais ne comptez pas dessus',
              texte:
                'Un chauffeur consciencieux gardera la pièce. Mais il fera vingt courses de plus dans la journée, et le passager ne remontera pas dans son véhicule. La pièce finit dans la boîte à gants, puis oubliée.',
            },
            {
              titre: 'Prenez-la et déclarez-la',
              texte:
                'C’est le geste le plus utile. Une photo du recto, le nom, la commune du trajet. Le flou sur le numéro et la date de naissance est appliqué automatiquement.',
            },
            {
              titre: 'Indiquez le trajet, pas seulement la commune',
              texte:
                '« Gbaka Adjamé–Yopougon » ou « taxi communal Cocody » aide énormément : c’est souvent à ce détail que le propriétaire se reconnaît et comprend qu’il s’agit bien de sa pièce.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Si vous êtes le chauffeur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Vous en trouvez plus que n’importe qui : plusieurs par mois pour certains. Et vous savez mieux que personne que garder la pièce ne mène nulle part — le passager ne remontera pas dans votre véhicule.',
        },
        {
          type: 'liste',
          items: [
            'Faites un passage rapide entre le dossier et l’assise en fin de service, c’est là que tout se coince.',
            'Déclarez d’un coup ce que vous avez accumulé : la déclaration prend moins d’une minute par pièce.',
            'Indiquez votre ligne ou votre secteur habituel plutôt qu’un point précis.',
            'Déposez le lot au commissariat ou à la mairie si vous ne voulez rien garder, et signalez-le dans la déclaration.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Ce que ça change pour votre journée',
          texte:
            'Vous n’avez plus à recevoir d’appels ni à organiser de rendez-vous. Le propriétaire est prévenu, il sait où aller, et vous n’entendez plus parler du dossier.',
        },
      ],
    },
  ],
  connexes: ['j-ai-trouve-une-cni', 'ou-deposer-piece-trouvee', 'piece-perdue-abidjan'],
};

export const trouvePieceEtranger: Guide = {
  slug: 'trouve-piece-etranger',
  titre: 'J’ai trouvé la pièce d’un étranger ou d’un ressortissant',
  description:
    'Passeport étranger, carte de séjour, carte consulaire : ce qu’il faut faire quand la pièce trouvée n’est pas ivoirienne.',
  chapo:
    'Une pièce étrangère perdue en Côte d’Ivoire met son propriétaire dans une situation bien pire qu’un national : sans elle, il ne peut souvent ni circuler, ni repartir.',
  miseAJour: '2026-08-24',
  question: 'J’ai trouvé un passeport étranger, que dois-je en faire ?',
  sections: [
    {
      titre: 'Pourquoi c’est plus urgent que d’habitude',
      blocs: [
        {
          type: 'liste',
          items: [
            'Sans son passeport, un voyageur ne peut ni embarquer, ni prouver la régularité de son séjour.',
            'Les démarches de remplacement passent par une représentation diplomatique, ce qui prend du temps et suppose de se déplacer.',
            'La personne n’a souvent aucun réseau local pour l’aider à chercher.',
          ],
        },
      ],
    },
    {
      titre: 'La marche à suivre',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Déclarez-la comme n’importe quelle autre pièce',
              texte:
                'Le nom figurant sur le document suffit. Pièci ne distingue pas la nationalité : ce qui compte, c’est que quelqu’un cherche ce document.',
            },
            {
              titre: 'Précisez le type exact',
              texte:
                'Passeport, carte de séjour, carte consulaire : la personne qui cherche saura immédiatement si c’est le sien.',
            },
            {
              titre: 'Déposez-la au commissariat si vous ne pouvez pas la garder',
              texte:
                'C’est le point de dépôt vers lequel une représentation diplomatique orientera son ressortissant. Indiquez le lieu dans votre déclaration.',
            },
          ],
        },
        {
          type: 'encadre',
          titre: 'Ne tentez pas de contacter une ambassade à sa place',
          texte:
            'Elles ne traitent qu’avec leurs ressortissants, et vous perdrez du temps au téléphone. Votre rôle s’arrête à rendre le document trouvable : c’est déjà l’essentiel.',
        },
      ],
    },
    {
      titre: 'Ce que vous n’avez pas à faire',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Rendre un document ne fait de vous ni un enquêteur ni un intermédiaire. Beaucoup de gens renoncent à aider parce qu’ils imaginent des démarches qui n’existent pas.',
        },
        {
          type: 'liste',
          items: [
            'Vous n’avez pas à retrouver la personne vous-même, ni à chercher son adresse.',
            'Vous n’avez pas à garder le document chez vous si ça vous encombre.',
            'Vous n’avez pas à avancer le moindre franc.',
            'Vous n’avez pas à justifier comment vous l’avez trouvé.',
            'Vous n’avez aucune responsabilité si personne ne se manifeste.',
          ],
        },
      ],
    },
    {
      titre: 'Un mot sur la discrétion',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Un passeport ou un titre de séjour contient bien plus d’informations qu’une carte d’identité : nationalité, tampons d’entrée, parfois des mentions administratives. Ce sont des données que la personne n’a aucune envie de voir circuler.',
        },
        {
          type: 'paragraphe',
          texte:
            'Ne publiez donc pas le document tel quel sur un réseau social. Le flou automatique appliqué à la publication existe précisément pour que rendre service ne revienne pas à exposer quelqu’un.',
        },
      ],
    },
  ],
  connexes: ['j-ai-trouve-une-cni', 'ou-deposer-piece-trouvee', 'passeport-perdu'],
};
