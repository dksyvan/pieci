import type { Guide } from './types';

/**
 * Guides de prévention et de contexte.
 *
 * Ceux-là ne se lisent pas dans l'urgence : ils captent les recherches faites
 * à froid, et ce sont eux qui installent la crédibilité du site sur la durée.
 * C'est aussi là qu'on peut être utile sans rien vendre.
 */

export const protegerSesPapiers: Guide = {
  slug: 'proteger-ses-papiers',
  titre: 'Ne plus perdre ses papiers : ce qui marche vraiment',
  description:
    'Les habitudes simples qui évitent la perte d’une pièce d’identité, et celles qui n’y changent rien malgré ce qu’on croit.',
  chapo:
    'On ne perd pas ses papiers par négligence, mais par répétition : le même geste, cent fois par mois, finit par mal tourner une fois. La solution n’est pas de faire attention — c’est de changer le geste.',
  miseAJour: '2026-08-24',
  question: 'Comment éviter de perdre sa pièce d’identité ?',
  sections: [
    {
      titre: 'La règle qui compte le plus',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Ne sortez pas l’original quand une copie suffit. La plupart des situations où l’on sort sa pièce — une inscription, une entrée d’immeuble, un formulaire — n’exigent pas l’original. Chaque sortie inutile est un risque pris pour rien.',
        },
      ],
    },
    {
      titre: 'Ce qui marche',
      blocs: [
        {
          type: 'liste',
          items: [
            'Une place fixe et unique : le même compartiment, toujours. Le cerveau finit par vérifier tout seul.',
            'Une poche qui ferme. La poche arrière de pantalon est la première cause de perte, très loin devant.',
            'Une photo du recto et du verso dans le téléphone, dans un album protégé.',
            'Le geste de vérification en descendant d’un véhicule, pas en arrivant.',
            'Séparer la pièce d’identité de l’argent : deux endroits différents, deux risques indépendants.',
          ],
        },
      ],
    },
    {
      titre: 'Ce qui ne sert à rien',
      blocs: [
        {
          type: 'liste',
          items: [
            'Se promettre de faire attention : aucune décision consciente ne survit à trois semaines d’habitude.',
            'Plastifier la pièce : elle glisse davantage, et certains guichets la refusent.',
            'Tout mettre dans un seul portefeuille : le jour où il disparaît, tout disparaît.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Le vrai filet de sécurité',
          texte:
            'Une photo de vos papiers dans votre téléphone ne remplace pas l’original, mais elle change tout le reste : elle vous donne les numéros, les dates, l’orthographe exacte de vos noms. C’est ce qui fait la différence entre une démarche d’une heure et une démarche d’une semaine.',
        },
      ],
    },
  ],
  connexes: ['numeriser-ses-papiers', 'cni-perdue-que-faire', 'usurpation-identite'],
};

export const numeriserSesPapiers: Guide = {
  slug: 'numeriser-ses-papiers',
  titre: 'Photographier ses papiers : comment le faire sans risque',
  description:
    'Garder une copie de ses pièces dans son téléphone est une bonne idée — à condition de ne pas créer un risque pire que celui qu’on évite.',
  chapo:
    'Tout le monde conseille de photographier ses papiers. Presque personne ne dit où mettre ces photos, ni ce qui se passe si le téléphone est perdu à son tour.',
  miseAJour: '2026-08-24',
  question: 'Comment garder une copie de mes papiers en sécurité ?',
  sections: [
    {
      titre: 'Pourquoi le faire quand même',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Sans copie, une perte vous laisse sans rien : ni numéro, ni date de délivrance, ni orthographe certaine de vos noms. Avec une copie, vous arrivez au guichet avec tous les éléments, et vous divisez la démarche par deux.',
        },
      ],
    },
    {
      titre: 'Comment le faire correctement',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Photographiez recto et verso, à plat, en pleine lumière',
              texte:
                'Un reflet sur le numéro rend la copie inutilisable au moment où vous en aurez besoin. Vérifiez que tout est lisible avant de ranger.',
            },
            {
              titre: 'Sortez-les de la galerie ordinaire',
              texte:
                'Une photo dans la pellicule est vue par toute application qui obtient l’accès aux images. Utilisez l’album verrouillé de votre téléphone, ou un espace protégé par un code distinct.',
            },
            {
              titre: 'Verrouillez le téléphone lui-même',
              texte:
                'Un code d’écran est le seul rempart qui protège réellement l’ensemble. Sans lui, tout le reste est décoratif.',
            },
            {
              titre: 'Prévoyez une copie hors du téléphone',
              texte:
                'Un espace de stockage protégé par mot de passe, ou une impression rangée chez un proche de confiance. Un téléphone se perd aussi.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Ce qu’il ne faut jamais faire',
      blocs: [
        {
          type: 'liste',
          items: [
            'S’envoyer la photo à soi-même sur WhatsApp : elle reste dans une conversation, sauvegardée et récupérable.',
            'L’envoyer à un tiers « pour la garder » : vous perdez le contrôle définitivement.',
            'La publier, même partiellement. Le numéro et la date de naissance suffisent à monter une usurpation.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Le flou n’est pas une option cosmétique',
          texte:
            'C’est pour cette raison que Pièci floute le numéro, la date de naissance et la signature avant toute publication : une pièce trouvée doit être reconnaissable par son propriétaire, sans être exploitable par un inconnu.',
        },
      ],
    },
  ],
  connexes: ['proteger-ses-papiers', 'usurpation-identite'],
};

export const usurpationIdentite: Guide = {
  slug: 'usurpation-identite',
  titre: 'Usurpation d’identité : le risque réel après une perte',
  description:
    'Ce qu’un inconnu peut et ne peut pas faire avec votre pièce d’identité, et comment vous protéger sans céder à la panique.',
  chapo:
    'Entre l’angoisse totale et l’indifférence, il y a une évaluation raisonnable. Voici ce qui est réellement possible avec une pièce trouvée, et ce qui ne l’est pas.',
  miseAJour: '2026-08-24',
  question: 'Que peut faire quelqu’un avec ma pièce d’identité perdue ?',
  sections: [
    {
      titre: 'Ce qui est difficile',
      blocs: [
        {
          type: 'liste',
          items: [
            'Retirer de l’argent à un guichet : la photo est comparée au porteur.',
            'Se présenter à votre place là où on vous connaît.',
            'Passer un contrôle si le visage ne correspond pas.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'La photo est la protection principale d’une pièce d’identité, et elle est bien meilleure qu’on ne le croit. C’est pour cela qu’une pièce volée est presque toujours jetée : elle ne vaut rien pour celui qui l’a.',
        },
      ],
    },
    {
      titre: 'Ce qui est possible, et donc à surveiller',
      blocs: [
        {
          type: 'liste',
          items: [
            'Souscrire un abonnement ou un service à distance, sans présentation physique.',
            'Servir de justificatif dans un dossier monté par quelqu’un qui vous ressemble.',
            'Alimenter une fraude documentaire : le numéro et l’état civil réutilisés ailleurs.',
          ],
        },
      ],
    },
    {
      titre: 'Vos protections concrètes',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'La déclaration de perte, datée',
              texte:
                'C’est votre pièce maîtresse. Elle établit à partir de quand vous n’aviez plus le document. Tout ce qui est fait après ne peut pas vous être imputé de bonne foi.',
            },
            {
              titre: 'Une plainte s’il s’agit d’un vol',
              texte:
                'Le vol est un fait distinct de la perte, et il pèse plus lourd si vous devez contester une démarche faite en votre nom.',
            },
            {
              titre: 'La récupération elle-même',
              texte:
                'La meilleure protection reste de récupérer la pièce. Tant qu’elle circule, le risque existe ; le jour où elle vous revient, il s’arrête.',
            },
          ],
        },
        {
          type: 'encadre',
          titre: 'Pourquoi le registre public reste discret',
          texte:
            'Pièci n’affiche que le prénom et l’initiale du nom, et floute les données sensibles. Publier une pièce en clair pour aider son propriétaire créerait exactement le risque qu’on cherche à écarter.',
        },
      ],
    },
  ],
  connexes: ['cni-volee-que-faire', 'proteger-ses-papiers', 'numeriser-ses-papiers'],
};

export const combienDeTempsChercher: Guide = {
  slug: 'combien-de-temps-chercher',
  titre: 'Faut-il refaire sa pièce tout de suite, ou attendre ?',
  description:
    'Chercher ou refaire : comment arbitrer sans perdre de temps ni d’argent, et pourquoi les deux ne s’opposent pas.',
  chapo:
    'C’est la question que tout le monde se pose au bout de trois jours. Elle est mal posée : chercher et refaire ne sont pas deux options concurrentes.',
  miseAJour: '2026-08-24',
  question: 'Combien de temps chercher avant de refaire sa pièce ?',
  sections: [
    {
      titre: 'Menez les deux de front',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'La recherche ne coûte rien et ne demande aucun déplacement. La refabrication demande du temps, des déplacements et des frais. Il n’y a donc aucune raison d’arrêter l’une pour commencer l’autre.',
        },
        {
          type: 'paragraphe',
          texte:
            'Engagez la démarche de renouvellement selon votre urgence réelle — un voyage, un emploi, une échéance bancaire — et laissez l’alerte tourner en parallèle. Elle ne vous demande rien.',
        },
      ],
    },
    {
      titre: 'Ce que le calendrier des trouvailles nous apprend',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Une pièce n’est presque jamais déclarée le jour où elle est ramassée. Celui qui l’a trouvée la garde d’abord, espère un appel, la pose quelque part, puis cherche quoi en faire une ou deux semaines plus tard. C’est à ce moment-là que la déclaration apparaît.',
        },
        {
          type: 'encadre',
          titre: 'Ce qu’il faut en retenir',
          texte:
            'Ne fermez pas votre alerte parce que rien n’arrive la première semaine. C’est précisément la période où il est normal que rien n’arrive.',
        },
      ],
    },
    {
      titre: 'Les urgences qui tranchent la question',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'La bonne question n’est pas « depuis combien de temps ai-je perdu ma pièce », mais « de quoi ai-je besoin, et quand ». Trois situations imposent de lancer le renouvellement sans attendre.',
        },
        {
          type: 'tableau',
          entetes: ['Situation', 'Ce qui est en jeu', 'Décision'],
          lignes: [
            ['Voyage prévu', 'Embarquement, visa, passage de frontière', 'Renouveler tout de suite'],
            ['Embauche ou concours', 'Dossier refusé si le titre manque', 'Renouveler tout de suite'],
            ['Opération bancaire', 'Compte bloqué, virement impossible', 'Renouveler tout de suite'],
            ['Aucune échéance', 'Rien d’immédiat', 'Chercher d’abord, quelques semaines'],
          ],
        },
      ],
    },
    {
      titre: 'Si vous récupérez la pièce après avoir lancé le renouvellement',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Signalez-le au service qui traite votre dossier. Deux titres valides au même nom sont une source de confusion durable, et il vaut mieux régulariser tout de suite que d’avoir à s’expliquer plus tard.',
        },
        {
          type: 'paragraphe',
          texte:
            'Cela n’a rien d’exceptionnel : entre le dépôt d’un dossier et la remise du nouveau titre, il se passe assez de temps pour qu’une pièce ramassée refasse surface. Le dire vous évite d’avoir à le justifier au premier contrôle où les deux numéros ne correspondent pas.',
        },
      ],
    },
  ],
  connexes: ['cni-perdue-que-faire', 'cni-perdue-sans-numero'],
};

export const pourquoiPieci: Guide = {
  slug: 'pourquoi-chercher-par-nom',
  titre: 'Pourquoi Pièci cherche par le nom, et pas par un numéro',
  description:
    'Un choix technique qui décide de qui peut être aidé. Comment fonctionne le rapprochement, et pourquoi il tolère les fautes d’orthographe.',
  chapo:
    'Demander un numéro à quelqu’un qui a perdu la pièce où ce numéro était écrit, c’est écarter d’emblée ceux qu’on prétend aider. Nous avons construit l’inverse.',
  miseAJour: '2026-08-24',
  question: 'Comment Pièci retrouve-t-il une pièce sans numéro ?',
  sections: [
    {
      titre: 'Le principe',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Deux personnes décrivent le même document sans le savoir : l’une l’a perdu, l’autre l’a trouvé. Le rapprochement compare ce que les deux connaissent forcément — le nom inscrit dessus, le type de pièce, le lieu.',
        },
        {
          type: 'paragraphe',
          texte:
            'Aucune de ces informations n’exige d’avoir le document sous les yeux. C’est toute la différence.',
        },
      ],
    },
    {
      titre: 'La tolérance aux variantes',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Un nom ivoirien s’écrit rarement d’une seule façon. L’apostrophe se met ou se perd, les doublements de consonnes varient, l’ordre du nom et du prénom s’inverse selon les documents. Une comparaison stricte échouerait sur la moitié des cas réels.',
        },
        {
          type: 'tableau',
          entetes: ['Saisi par celui qui cherche', 'Saisi par celui qui a trouvé', 'Rapproché'],
          lignes: [
            ['Nguessan Koffi', 'N’Guessan Koffi', 'Oui'],
            ['Kouassy', 'Kouassi', 'Oui'],
            ['Aya Konan', 'Konan Aya', 'Oui'],
            ['Traore Fatoumata', 'Traoré Fatimata', 'Oui'],
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Le rapprochement mesure la proximité entre deux écritures plutôt que leur égalité. Un écart d’une lettre, un accent absent ou un ordre inversé ne suffisent pas à faire manquer une correspondance.',
        },
      ],
    },
    {
      titre: 'Ce que nous ne demandons pas, et pourquoi',
      blocs: [
        {
          type: 'liste',
          items: [
            'Aucun numéro de pièce : vous l’avez perdu avec le document.',
            'Aucun numéro d’identification : presque personne ne le connaît par cœur.',
            'Aucun compte à créer : un numéro de téléphone suffit à vous prévenir.',
            'Aucun paiement, à aucune étape.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Ce que ça change concrètement',
          texte:
            'Une personne qui vient de perdre sa pièce peut lancer une recherche en moins de deux minutes, depuis un téléphone, sans rien avoir sous la main. C’est la seule mesure qui compte.',
        },
      ],
    },
  ],
  connexes: ['cni-perdue-sans-numero', 'cni-perdue-que-faire', 'j-ai-trouve-une-cni'],
};
