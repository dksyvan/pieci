import type { Guide } from './types';

/**
 * Suite des guides « j'ai perdu », par type de document. Même règle
 * d'écriture que dans `guides-perte.ts` : aucun montant, aucun délai, aucune
 * liste de pièces à fournir inventés.
 */

export const cniVolee: Guide = {
  slug: 'cni-volee-que-faire',
  titre: 'Carte d’identité volée : les réflexes à avoir',
  description:
    'Vol de sac, pickpocket, cambriolage : votre pièce d’identité est partie avec. Ce qu’il faut faire vite, et pourquoi la chercher quand même.',
  chapo:
    'Un vol n’est pas une perte. Mais posez-vous la question : le voleur en voulait-il à vos papiers, ou à votre argent ? Dans l’immense majorité des cas, à votre argent. Les papiers, eux, finissent jetés — et parfois ramassés.',
  miseAJour: '2026-08-24',
  question: 'On m’a volé ma carte d’identité, que faire ?',
  sections: [
    {
      titre: 'Distinguer ce qui est urgent de ce qui peut attendre',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Bloquez ce qui donne accès à de l’argent',
              texte:
                'Cartes bancaires, comptes mobile money. C’est là que le préjudice se compte en heures, pas en jours. Appelez votre banque et votre opérateur avant tout le reste.',
            },
            {
              titre: 'Portez plainte, pas seulement déclaration de perte',
              texte:
                'Un vol se déclare comme un vol. La distinction compte si votre identité est ensuite utilisée : elle établit que vous n’étiez plus en possession du document.',
            },
            {
              titre: 'Cherchez malgré tout',
              texte:
                'Un voleur garde le portefeuille et jette les papiers, souvent à quelques rues de là. Beaucoup de pièces déclarées trouvées viennent exactement de là : un caniveau, un terrain vague, une poubelle.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Ce qu’un voleur peut réellement faire de votre pièce',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Beaucoup moins qu’on ne le craint, mais pas rien. Une pièce au nom d’un autre ne permet pas de vider un compte : au guichet, on compare la photo. Le risque réel est l’ouverture d’un compte ou d’un abonnement à votre nom, par quelqu’un qui vous ressemble assez.',
        },
        {
          type: 'encadre',
          titre: 'La plainte est votre protection',
          texte:
            'C’est le document qui date la fin de votre possession. Si une démarche est faite à votre nom après cette date, vous avez de quoi le démontrer. Gardez-en une photo sur votre téléphone.',
        },
      ],
    },
    {
      titre: 'Où les papiers volés réapparaissent',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Un voleur trie vite et se débarrasse de ce qui l’encombre. Les papiers ressortent donc à quelques centaines de mètres du vol, dans des endroits assez constants pour qu’on puisse les nommer.',
        },
        {
          type: 'liste',
          items: [
            'Les caniveaux et les bas-côtés de la rue où le vol a eu lieu.',
            'Les terrains vagues et les tas d’ordures les plus proches.',
            'Les toilettes et les recoins des gares routières et des marchés.',
            'Le sol des transports en commun, quand le tri s’est fait en route.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Ces endroits sont fréquentés. Quelqu’un finit presque toujours par ramasser le document — un commerçant, un balayeur, un passant. La question n’est pas de savoir si votre pièce sera trouvée, mais si celui qui la trouve saura vous joindre.',
        },
      ],
    },
    {
      titre: 'Et si quelqu’un vous appelle pour vous la rendre',
      blocs: [
        {
          type: 'liste',
          items: [
            'Fixez la remise dans un lieu public et fréquenté : mairie, commissariat, pharmacie, station-service.',
            'N’envoyez jamais d’argent avant d’avoir le document en main.',
            'Méfiez-vous d’un interlocuteur qui refuse de vous décrire la pièce ou de dire où il l’a trouvée.',
            'Faites-vous accompagner si le rendez-vous vous met mal à l’aise.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Ces précautions ne visent pas les personnes honnêtes, qui sont l’immense majorité. Elles servent à ce que la restitution reste simple pour tout le monde — y compris pour celui qui rend service et n’a aucune envie d’être soupçonné.',
        },
      ],
    },
  ],
  connexes: ['usurpation-identite', 'cni-perdue-que-faire', 'proteger-ses-papiers'],
};

export const passeportPerdu: Guide = {
  slug: 'passeport-perdu',
  titre: 'Passeport perdu en Côte d’Ivoire : la marche à suivre',
  description:
    'Perdre son passeport quand un voyage approche. Ce qu’il faut faire tout de suite, et comment maximiser vos chances de le retrouver avant de le refaire.',
  chapo:
    'Le passeport est la pièce dont la perte se remarque le plus tard — on ne le sort qu’au moment de partir. C’est aussi celle qu’on retrouve le plus souvent chez soi.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu mon passeport, que faire ?',
  sections: [
    {
      titre: 'Avant tout : fouillez encore',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le passeport voyage peu et se range bien. Il est rarement tombé dans la rue : il est resté dans une pochette, un sac de voyage, un tiroir de bureau, chez un parent, ou entre les mains de qui a préparé votre dernier visa.',
        },
        {
          type: 'liste',
          items: [
            'Le sac ou la valise du dernier voyage, doublure comprise.',
            'L’agence de voyage ou le service qui a instruit votre dernier visa.',
            'L’employeur, si un déplacement professionnel a été organisé.',
            'Le domicile familial, si vous y avez laissé des documents.',
          ],
        },
      ],
    },
    {
      titre: 'Si la perte est confirmée',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Déclarez la perte',
              texte:
                'La déclaration au commissariat est le point de départ de toute démarche de renouvellement, et votre protection si le document circule.',
            },
            {
              titre: 'Rassemblez ce que vous avez',
              texte:
                'Une photocopie, une photo prise au téléphone, un ancien visa, un numéro noté quelque part : tout élément qui identifie le document accélère les choses.',
            },
            {
              titre: 'Signalez la perte sur Pièci',
              texte:
                'Un passeport trouvé est presque toujours rapporté — c’est un document que personne ne jette. Encore faut-il que celui qui l’a puisse vous joindre.',
            },
          ],
        },
        {
          type: 'encadre',
          titre: 'Un voyage dans les jours qui viennent ?',
          texte:
            'Dites-le dès le premier guichet. Les délais et les procédures d’urgence évoluent : c’est le service instructeur qui vous dira ce qui est possible dans votre situation exacte, et lui seul.',
        },
      ],
    },
  ],
  connexes: ['cni-perdue-que-faire', 'numeriser-ses-papiers', 'proteger-ses-papiers'],
};

export const permisPerdu: Guide = {
  slug: 'permis-conduire-perdu',
  titre: 'Permis de conduire perdu : que faire en attendant',
  description:
    'Vous conduisez sans permis sur vous, sans l’avoir voulu. Comment vous protéger d’un contrôle et retrouver le document.',
  chapo:
    'Contrairement à une pièce d’identité, l’absence de permis se paie tout de suite : au premier contrôle. Voilà comment limiter les dégâts.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu mon permis de conduire, que faire ?',
  sections: [
    {
      titre: 'Le jour même',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Faites la déclaration de perte',
              texte:
                'C’est ce que vous présenterez en cas de contrôle. Sans elle, vous n’avez rien à opposer ; avec elle, vous démontrez votre bonne foi et l’existence du titre.',
            },
            {
              titre: 'Regardez d’abord dans le véhicule',
              texte:
                'Boîte à gants, sous les sièges, dans la portière, sous le tapis. Le permis se perd le plus souvent dans la voiture elle-même, ou chez le garagiste qui l’a déplacée.',
            },
            {
              titre: 'Déclarez-le perdu sur Pièci',
              texte:
                'Un permis tombé sur un parking ou dans un taxi est très souvent ramassé. Votre nom suffit pour créer l’alerte.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Les endroits qu’on oublie de fouiller',
      blocs: [
        {
          type: 'liste',
          items: [
            'Le garage ou le lavage auto : on sort ses papiers pour les remettre à quelqu’un.',
            'Le bureau de l’assureur, lors du dernier renouvellement.',
            'La station-service, si vous avez sorti votre portefeuille pour payer.',
            'Le dernier poste de contrôle où on vous l’a demandé.',
          ],
        },
      ],
    },
    {
      titre: 'Se présenter à un contrôle sans le permis',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Ce qui joue en votre faveur, c’est d’avoir anticipé. Un conducteur qui présente une déclaration de perte datée montre qu’il a un titre et qu’il a fait la démarche ; un conducteur qui explique simplement qu’il l’a perdu la semaine dernière n’a rien à montrer.',
        },
        {
          type: 'liste',
          items: [
            'Ayez la déclaration de perte sur vous, en original et en photo dans le téléphone.',
            'Gardez également la carte grise et l’attestation d’assurance : un dossier complet moins une pièce se traite mieux qu’un dossier troué.',
            'Si vous avez une photocopie du permis, joignez-la — elle établit le numéro et la catégorie.',
            'Restez calme et factuel : la perte d’un titre est une situation banale, pas une infraction en soi.',
          ],
        },
      ],
    },
    {
      titre: 'Si vous conduisez pour vivre',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Chauffeur de taxi, de gbaka, livreur, conducteur d’entreprise : la perte du permis coupe votre revenu, pas seulement votre mobilité. Engagez la démarche de duplicata le jour même, sans attendre de voir si le document réapparaît.',
        },
        {
          type: 'encadre',
          titre: 'Menez les deux en parallèle',
          texte:
            'Lancer le duplicata n’empêche pas de chercher, et chercher ne retarde pas le duplicata. Déclarez la perte en ligne le même jour : si quelqu’un rapporte le permis avant que le nouveau soit prêt, vous reprenez le volant plus tôt.',
        },
      ],
    },
  ],
  connexes: ['carte-grise-perdue', 'trouve-piece-dans-taxi', 'cni-perdue-que-faire'],
};

export const carteGrisePerdue: Guide = {
  slug: 'carte-grise-perdue',
  titre: 'Carte grise perdue : ce que ça bloque et quoi faire',
  description:
    'La carte grise n’est pas une pièce d’identité, mais sa perte bloque autant : contrôle, vente, assurance. Les gestes utiles.',
  chapo:
    'La carte grise ne prouve pas qui vous êtes, elle prouve que le véhicule est à vous. Sa perte se règle donc autrement — et elle se retrouve souvent dans le véhicule lui-même.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu la carte grise de mon véhicule, que faire ?',
  sections: [
    {
      titre: 'Pourquoi c’est bloquant',
      blocs: [
        {
          type: 'liste',
          items: [
            'Un contrôle routier sans carte grise met en cause le véhicule, pas seulement le conducteur.',
            'Une vente devient impossible : l’acheteur ne peut pas faire établir son propre titre.',
            'Un sinistre se règle plus difficilement sans preuve de propriété.',
          ],
        },
      ],
    },
    {
      titre: 'Les gestes utiles',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Déclaration de perte',
              texte:
                'Comme pour tout titre, elle ouvre la démarche de duplicata et fait foi entre-temps.',
            },
            {
              titre: 'Retrouvez l’immatriculation et le numéro de châssis',
              texte:
                'Le châssis est frappé sur le véhicule lui-même. Ces deux numéros identifient le titre même sans la carte, et vous évitent de repartir de zéro.',
            },
            {
              titre: 'Ratissez le véhicule et ceux qui l’ont manipulé',
              texte:
                'Garagiste, contrôle technique, assureur, acheteur potentiel à qui vous l’avez montrée. Un document confié se récupère bien plus souvent qu’un document tombé.',
            },
            {
              titre: 'Déclarez-la si c’est vous qui l’avez ramassée',
              texte:
                'Une carte grise trouvée sur un parking a un propriétaire identifiable et très motivé. Pièci accepte ce document comme les autres.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Ce qu’il vaut mieux avoir avant d’aller au guichet',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Rien n’est plus coûteux qu’un déplacement pour rien. Réunissez d’abord tout ce qui rattache le véhicule à vous — plus le dossier est complet, moins on vous renverra chercher une pièce manquante.',
        },
        {
          type: 'liste',
          items: [
            'La déclaration de perte, en original.',
            'Votre pièce d’identité en cours de validité.',
            'L’attestation d’assurance et le dernier contrôle technique.',
            'Le numéro d’immatriculation et le numéro de châssis, relevés sur le véhicule.',
            'Tout justificatif d’achat : facture, acte de vente, ancien récépissé.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Les conditions changent',
          texte:
            'Les pièces exigées et les frais évoluent d’une année sur l’autre. Renseignez-vous auprès du service compétent avant de vous déplacer plutôt que de vous fier à ce qu’on vous a raconté : c’est la seule information qui engage.',
        },
      ],
    },
    {
      titre: 'Le cas de l’achat d’occasion',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Si un vendeur vous propose un véhicule en expliquant que la carte grise est perdue, prenez le temps. Le titre est ce qui prouve à qui appartient le véhicule ; sans lui, vous n’achetez pas grand-chose, et vous ne pourrez pas faire établir le vôtre.',
        },
        {
          type: 'liste',
          items: [
            'Demandez la déclaration de perte du vendeur, à son nom.',
            'Vérifiez que le numéro de châssis du véhicule correspond aux documents produits.',
            'Faites établir le duplicata avant la vente, pas après.',
            'Méfiez-vous d’une urgence à conclure : c’est le signal le plus fréquent d’un problème de titre.',
          ],
        },
      ],
    },
  ],
  connexes: ['permis-conduire-perdu', 'cni-perdue-que-faire'],
};

export const carteEtudiantPerdue: Guide = {
  slug: 'carte-etudiant-perdue',
  titre: 'Carte d’étudiant perdue : examens, bourse, campus',
  description:
    'Perdre sa carte d’étudiant à la mauvaise période, c’est risquer un examen. Ce qu’il faut faire, dans l’ordre, et où chercher.',
  chapo:
    'C’est la pièce la plus perdue et la moins déclarée : on la range mal, elle se plie, et on s’en aperçoit à la porte de la salle d’examen.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma carte d’étudiant, que faire ?',
  sections: [
    {
      titre: 'Si un examen approche',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Ne pariez pas sur une tolérance à la porte. Passez à la scolarité avant le jour de l’épreuve, expliquez la situation, et demandez ce qui fait office de justificatif chez vous. Chaque établissement a sa règle, et le surveillant applique la sienne, pas la vôtre.',
        },
      ],
    },
    {
      titre: 'Où elle se retrouve, presque toujours',
      blocs: [
        {
          type: 'liste',
          items: [
            'Dans un cahier ou un classeur, glissée comme marque-page.',
            'Au restaurant universitaire ou à la bibliothèque, où on la présente.',
            'Chez un camarade, après un prêt pour une photocopie.',
            'Dans le gbaka ou le woro-woro du trajet campus.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Le réflexe qui marche sur un campus',
          texte:
            'Déclarez-la perdue en précisant la commune. Une carte d’étudiant ramassée sur un campus l’est presque toujours par un autre étudiant — quelqu’un qui, lui, cherchera comment vous la rendre.',
        },
      ],
    },
    {
      titre: 'Tout ce qu’elle débloque, et qu’on oublie',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'On pense d’abord aux examens, mais la carte d’étudiant sert tous les jours. C’est ce qui explique qu’on s’aperçoive de sa perte à un moment gênant plutôt qu’au moment de la ranger.',
        },
        {
          type: 'liste',
          items: [
            'L’accès à la bibliothèque et aux salles de travail.',
            'Le restaurant universitaire et les tarifs étudiants.',
            'Les réductions de transport, quand elles existent.',
            'Le retrait de documents à la scolarité.',
            'Les justificatifs à fournir hors de l’université : banque, logement, stage.',
          ],
        },
      ],
    },
    {
      titre: 'En attendant le duplicata',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Rassemblez vos preuves d’inscription',
              texte:
                'Reçu de frais, certificat de scolarité, relevé de notes, ancien numéro de carte : de quoi établir que vous êtes bien inscrit, sans dépendre de la carte elle-même.',
            },
            {
              titre: 'Demandez le duplicata à la scolarité',
              texte:
                'Les conditions et les délais varient d’un établissement à l’autre, et changent d’une année sur l’autre. C’est votre service de scolarité qui fait foi, pas ce que raconte un camarade.',
            },
            {
              titre: 'Laissez l’alerte tourner',
              texte:
                'Une carte d’étudiant retrouvée après le duplicata reste utile : elle vous évite de payer une seconde fois si vous la reperdez, et elle prouve que le document n’a pas été détourné.',
            },
          ],
        },
      ],
    },
  ],
  connexes: ['cni-perdue-que-faire', 'j-ai-trouve-une-cni', 'proteger-ses-papiers'],
};
