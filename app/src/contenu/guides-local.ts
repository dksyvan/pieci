import type { Guide } from './types';

/**
 * Guides par territoire.
 *
 * Attention au piège de la page locale : décliner le même texte en changeant
 * le nom de la commune produit du contenu creux, que Google déclasse et que
 * personne ne lit. Chaque guide ici doit apporter ce qu'aucun autre ne peut
 * dire — les lieux réels où l'on perd ses papiers dans cette commune-là.
 */

export const pieceperdueAbidjan: Guide = {
  slug: 'piece-perdue-abidjan',
  titre: 'Pièce d’identité perdue à Abidjan : par où commencer',
  description:
    'Abidjan concentre l’essentiel des pertes de pièces d’identité du pays. Où chercher selon l’endroit où vous étiez, commune par commune.',
  chapo:
    'Dans une ville de cette taille, chercher au hasard ne mène nulle part. Ce qui marche, c’est de raisonner par flux : où étiez-vous, comment vous déplaciez-vous, et où passe le monde à cet endroit.',
  miseAJour: '2026-08-24',
  question: 'Où chercher une pièce d’identité perdue à Abidjan ?',
  sections: [
    {
      titre: 'Les trois situations qui couvrent presque tout',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Vous vous déplaciez',
              texte:
                'Taxi, gbaka, woro-woro, bateau-bus. C’est le cas le plus fréquent et le plus difficile : le lieu de la perte n’est pas un lieu, c’est un trajet. Déclarez la perte en indiquant le trajet et non un point.',
            },
            {
              titre: 'Vous étiez dans un lieu de foule',
              texte:
                'Marché, gare routière, stade, salle d’attente. La pièce a été ramassée presque à coup sûr — la question est de savoir par qui. C’est là que la déclaration en ligne fait le plus de différence.',
            },
            {
              titre: 'Vous étiez dans un lieu identifié',
              texte:
                'Banque, administration, boutique, restaurant, école. Retournez-y ou téléphonez : ces endroits conservent ce qu’on y trouve, souvent pendant des semaines. C’est le cas le plus facile, et le plus souvent négligé.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Les points de perte les plus denses de l’agglomération',
      blocs: [
        {
          type: 'tableau',
          entetes: ['Commune', 'Lieux à forte densité de perte'],
          lignes: [
            ['Adjamé', 'Gare routière, Marché d’Adjamé, Forum des Marchés, Liberté'],
            ['Yopougon', 'Siporex, Gesco, Niangon, Toits Rouges, Ananeraie'],
            ['Cocody', 'Riviera, Angré, Deux-Plateaux, campus universitaire'],
            ['Abobo', 'Abobo Gare, PK18, Avocatier, Anonkoua-Kouté'],
            ['Plateau', 'Cité administrative, agences bancaires, arrêts de bus'],
            ['Treichville', 'Grand Marché, gare de Bassam, abords du port'],
            ['Marcory', 'Zone 4, Biétry, Anoumabo'],
            ['Koumassi', 'Grand Marché, Remblais, Sicogi'],
            ['Port-Bouët', 'Abords de l’aéroport, Vridi, Gonzagueville'],
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Ces lieux ont un point commun : on y sort ses papiers, et on y est bousculé. C’est la combinaison qui fait tomber une pièce d’une poche ou d’un sac ouvert.',
        },
      ],
    },
    {
      titre: 'Ce qui change quand on déclare en ligne',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'À Abidjan, celui qui ramasse votre pièce n’est presque jamais de votre quartier. Il travaille peut-être au Plateau et dort à Abobo. Aucun statut WhatsApp, aucun groupe de quartier ne fera se croiser vos deux réseaux.',
        },
        {
          type: 'encadre',
          titre: 'C’est exactement ce que le registre corrige',
          texte:
            'Vous déclarez la perte, il déclare la trouvaille, et le rapprochement se fait sur les noms — sans que vous ayez besoin d’une connaissance commune. Aucun numéro n’est demandé, seulement votre nom.',
        },
      ],
    },
  ],
  connexes: ['cni-perdue-que-faire', 'trouve-piece-dans-taxi', 'piece-perdue-yopougon'],
};

export const pieceperdueYopougon: Guide = {
  slug: 'piece-perdue-yopougon',
  titre: 'Pièce perdue à Yopougon : où chercher',
  description:
    'Yopougon est la commune la plus peuplée d’Abidjan. Où se perdent les pièces d’identité et comment les retrouver quand on y habite.',
  chapo:
    'Yopougon est une ville dans la ville. On peut y perdre sa pièce à Gesco et la voir ramassée à Niangon sans que les deux quartiers se parlent jamais.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma pièce à Yopougon, où chercher ?',
  sections: [
    {
      titre: 'Les zones où ça arrive le plus',
      blocs: [
        {
          type: 'liste',
          items: [
            'Gesco et ses abords : point d’entrée et de sortie, tout le trafic y passe.',
            'Siporex : marché et commerces, foule dense toute la journée.',
            'Niangon Sud et Nord : zones résidentielles très étendues, trajets quotidiens longs.',
            'Toits Rouges, Ananeraie, Sideci, Wassakara : vie de quartier, maquis, transports partagés.',
            'Les abords des établissements scolaires, aux heures de sortie.',
          ],
        },
      ],
    },
    {
      titre: 'La spécificité de Yopougon',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'La densité de population joue dans les deux sens. Une pièce tombée est ramassée très vite — c’est une bonne nouvelle. Mais elle est ramassée par quelqu’un que vous ne connaîtrez jamais, dans une commune qui compte plus d’habitants que beaucoup de villes du pays.',
        },
        {
          type: 'paragraphe',
          texte:
            'Le bouche-à-oreille, très efficace à l’échelle d’un quartier, ne traverse pas la commune. C’est précisément l’écart que la déclaration en ligne comble.',
        },
      ],
    },
    {
      titre: 'La démarche',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Repassez sur vos pas dans le quartier',
              texte:
                'Le maquis, la boutique, la pharmacie, la cabine. Ces commerces gardent ce qu’ils trouvent, souvent longtemps, et personne ne pense à leur demander.',
            },
            {
              titre: 'Déclarez la perte en ligne',
              texte:
                'Votre nom, le type de pièce, la commune. Si quelqu’un a déjà déclaré votre pièce, vous le voyez tout de suite.',
            },
            {
              titre: 'Laissez l’alerte active',
              texte:
                'Beaucoup de pièces sont gardées plusieurs semaines par celui qui les a trouvées, avant qu’il ne cherche quoi en faire. L’alerte vous préviendra à ce moment-là.',
            },
          ],
        },
      ],
    },
  ],
  connexes: ['piece-perdue-abidjan', 'cni-perdue-que-faire', 'j-ai-trouve-une-cni'],
};

export const pieceperdueCocody: Guide = {
  slug: 'piece-perdue-cocody',
  titre: 'Pièce perdue à Cocody : où chercher',
  description:
    'De la Riviera à Angré en passant par le campus, où se perdent les pièces d’identité à Cocody et comment les récupérer.',
  chapo:
    'À Cocody, on perd moins ses papiers dans la rue que dans les lieux où on les sort : agences, réceptions, campus, salles de sport.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma pièce à Cocody, où chercher ?',
  sections: [
    {
      titre: 'Les lieux à rappeler en priorité',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'À Cocody plus qu’ailleurs, la pièce perdue est une pièce confiée puis oubliée. On la tend à un vigile, à une réception, à un guichet, et on repart sans elle.',
        },
        {
          type: 'liste',
          items: [
            'Les postes de sécurité à l’entrée des résidences et des immeubles de bureaux.',
            'Les réceptions d’agences bancaires et de cliniques.',
            'Le campus universitaire : bibliothèque, scolarité, salles d’examen.',
            'Les salles de sport et clubs, où la pièce sert à l’inscription.',
            'Les restaurants et lieux de sortie d’Angré et des Deux-Plateaux.',
          ],
        },
        {
          type: 'encadre',
          titre: 'Le réflexe qui marche',
          texte:
            'Téléphonez au lieu avant de vous déplacer, et demandez explicitement « les objets trouvés », pas « ma carte ». Le vigile de ce soir n’est pas celui d’hier, mais le tiroir, lui, n’a pas bougé.',
        },
      ],
    },
    {
      titre: 'Le cas du campus',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Les cartes d’étudiant et les pièces d’identité ramassées sur le campus le sont presque toujours par d’autres étudiants. Ils veulent bien faire mais ne savent pas où déposer, et gardent la pièce plusieurs semaines.',
        },
        {
          type: 'paragraphe',
          texte:
            'Déclarer votre perte en ligne, en précisant Cocody, vous met sur leur chemin le jour où ils chercheront quoi en faire.',
        },
      ],
    },
    {
      titre: 'Les sorties du soir',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Angré et les Deux-Plateaux concentrent une bonne part des pertes de fin de semaine. Le scénario est toujours le même : on présente sa pièce à l’entrée, on la range mal, et la soirée fait le reste.',
        },
        {
          type: 'liste',
          items: [
            'Rappelez l’établissement dès le lendemain matin, pas trois jours après : le personnel du soir n’est pas celui du jour.',
            'Demandez au vigile de l’entrée, pas seulement au bar — c’est lui qui manipule les pièces.',
            'Vérifiez la voiture et le taxi du retour avant de conclure à une perte sur place.',
            'Pensez aux poches de la veste, si vous avez changé de tenue.',
          ],
        },
      ],
    },
    {
      titre: 'La spécificité résidentielle',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Cocody est étendue et se traverse en voiture. Une pièce tombée sur un parking ou entre deux portières n’est pas ramassée par un voisin : elle l’est par quelqu’un qui passait là et qui repart ailleurs.',
        },
        {
          type: 'paragraphe',
          texte:
            'Le réflexe du quartier — demander autour de soi, laisser un mot au gardien — ne suffit donc pas ici. Il faut être joignable au-delà du périmètre où l’on est connu.',
        },
      ],
    },
  ],
  connexes: ['carte-etudiant-perdue', 'piece-perdue-abidjan', 'cni-perdue-que-faire'],
};

export const pieceperdueAbobo: Guide = {
  slug: 'piece-perdue-abobo',
  titre: 'Pièce perdue à Abobo : où chercher',
  description:
    'Abobo Gare, PK18, Avocatier, Anonkoua-Kouté : où se perdent les pièces d’identité et comment les retrouver.',
  chapo:
    'À Abobo, tout converge vers quelques points de passage. C’est là que les pièces tombent, et c’est là qu’il faut concentrer la recherche.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma pièce à Abobo, où chercher ?',
  sections: [
    {
      titre: 'Les points de convergence',
      blocs: [
        {
          type: 'liste',
          items: [
            'Abobo Gare : le nœud de transport de la commune, tout le monde y transite.',
            'PK18 : axe majeur, forte densité de commerces et de transports.',
            'Le marché et ses abords, aux heures d’affluence.',
            'Avocatier, Sagbé, Anonkoua-Kouté, N’Dotré : trajets quotidiens en transport partagé.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Si vous avez pris un transport ce jour-là, considérez que la pièce est tombée dedans plutôt que dans la rue. C’est statistiquement le cas le plus probable, et c’est aussi le seul où retourner sur place ne sert à rien.',
        },
      ],
    },
    {
      titre: 'Pourquoi la déclaration en ligne compte particulièrement ici',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Abobo est une commune de transit autant que de résidence. Celui qui ramasse votre pièce à Abobo Gare peut très bien habiter Anyama et travailler au Plateau. Il n’y a aucune chance qu’il croise votre entourage.',
        },
        {
          type: 'encadre',
          titre: 'Ce qu’il faut pour créer l’alerte',
          texte:
            'Votre nom, le type de pièce, votre numéro de téléphone. Rien d’autre — et surtout pas le numéro inscrit sur la pièce, que vous avez perdu avec elle.',
        },
      ],
    },
    {
      titre: 'La marche à suivre, dans l’ordre',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Refaites le trajet de la journée',
              texte:
                'Pas les lieux, le trajet. Où êtes-vous monté, où êtes-vous descendu, où avez-vous sorti quelque chose de votre poche ? C’est à ces trois moments que la pièce est tombée.',
            },
            {
              titre: 'Passez dans les commerces du quartier',
              texte:
                'Boutique, pharmacie, cabine, maquis : ce sont eux qui gardent ce qu’on trouve dans la rue, parfois pendant des mois, et personne ne pense à leur demander.',
            },
            {
              titre: 'Déclarez la perte en ligne',
              texte:
                'C’est ce qui vous rend joignable par une personne que vous ne connaissez pas et ne croiserez jamais. À Abobo, c’est le cas le plus probable.',
            },
            {
              titre: 'Faites la déclaration au commissariat',
              texte:
                'Elle vous protège tant que le document circule, et elle est demandée pour toute démarche de renouvellement.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Si vous avez pris un gbaka ce jour-là',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Retourner à l’arrêt ne sert à rien : le véhicule a fait dix rotations depuis. En revanche, le détail du trajet compte énormément dans votre déclaration. « Gbaka Abobo Gare–Adjamé, vers 7 h » permet à celui qui a ramassé la pièce de reconnaître la scène et d’être sûr qu’il s’agit bien de vous.',
        },
      ],
    },
  ],
  connexes: ['piece-perdue-abidjan', 'trouve-piece-dans-taxi', 'cni-perdue-sans-numero'],
};

export const pieceperdueAdjame: Guide = {
  slug: 'piece-perdue-adjame',
  titre: 'Pièce perdue à Adjamé : le cas le plus difficile',
  description:
    'Gare routière, marché, Forum des Marchés : Adjamé est l’endroit d’Abidjan où l’on perd le plus de pièces, et le plus dur où chercher.',
  chapo:
    'Adjamé mérite son propre guide. C’est le point où convergent les voyageurs de tout le pays, et l’endroit où retourner sur ses pas ne sert presque à rien.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma pièce à Adjamé, que faire ?',
  sections: [
    {
      titre: 'Pourquoi Adjamé est un cas à part',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Partout ailleurs, celui qui ramasse votre pièce reste dans la même ville. À la gare routière d’Adjamé, il peut monter dans un car et se retrouver à Bouaké, Korhogo ou Man le soir même, votre pièce dans la poche.',
        },
        {
          type: 'paragraphe',
          texte:
            'C’est ce qui rend la recherche sur place illusoire : le document n’est plus là. Il faut donc un moyen de rester joignable où qu’il aille — pas un moyen de fouiller.',
        },
      ],
    },
    {
      titre: 'Les zones concernées',
      blocs: [
        {
          type: 'liste',
          items: [
            'La gare routière et ses abords immédiats.',
            'Le Marché d’Adjamé et le Forum des Marchés.',
            'Liberté, Roxy, Williamsville, 220 Logements.',
            'Les arrêts de bus et les points de départ de gbakas.',
          ],
        },
      ],
    },
    {
      titre: 'La seule démarche qui tienne',
      blocs: [
        {
          type: 'etapes',
          items: [
            {
              titre: 'Déclarez la perte en ligne, tout de suite',
              texte:
                'C’est le seul dispositif qui fonctionne encore quand votre pièce a quitté la ville. L’alerte reste active où que le document se trouve.',
            },
            {
              titre: 'Ne limitez pas votre recherche à Abidjan',
              texte:
                'Consultez le registre national, pas seulement votre commune. Une pièce perdue à Adjamé est régulièrement déclarée depuis l’intérieur du pays.',
            },
            {
              titre: 'Faites aussi la déclaration au commissariat',
              texte:
                'Elle vous protège pendant tout le temps où le document circule hors de votre contrôle.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Ce qui vaut quand même la peine sur place',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Illusoire ne veut pas dire inutile. Certains points d’Adjamé conservent réellement ce qu’on y trouve, parce que les mêmes personnes y travaillent tous les jours.',
        },
        {
          type: 'liste',
          items: [
            'Les guichets des compagnies de transport : ils gardent ce qui reste dans les cars.',
            'Les commerçants installés à demeure dans le marché, par opposition aux vendeurs ambulants.',
            'Les pharmacies et les cabines, qui ont un comptoir et une caisse.',
            'Le poste de police du secteur, où l’on rapporte spontanément les pièces.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Faites cette tournée une fois, sans y consacrer votre semaine. L’essentiel du travail sera fait par l’alerte, qui ne dort pas et ne dépend pas de votre présence.',
        },
      ],
    },
    {
      titre: 'Si votre pièce est partie vers l’intérieur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Ce n’est pas une mauvaise nouvelle. Une pièce ramassée dans un car est souvent remise au chauffeur ou au receveur à l’arrivée, et déclarée depuis la ville de destination. Le rapprochement se fait sur votre nom : la distance ne change rien.',
        },
      ],
    },
  ],
  connexes: ['piece-perdue-abidjan', 'piece-perdue-bouake', 'cni-volee-que-faire'],
};

export const pieceperdueBouake: Guide = {
  slug: 'piece-perdue-bouake',
  titre: 'Pièce perdue à Bouaké et dans l’intérieur du pays',
  description:
    'Hors d’Abidjan, la recherche d’une pièce perdue suit d’autres règles. Ce qui marche à Bouaké, Korhogo, Daloa ou Yamoussoukro.',
  chapo:
    'À l’intérieur du pays, les réseaux de proximité fonctionnent mieux qu’à Abidjan — mais ils s’arrêtent aux limites de la ville. Le voyageur de passage, lui, échappe à tout.',
  miseAJour: '2026-08-24',
  question: 'J’ai perdu ma pièce à Bouaké, comment la retrouver ?',
  sections: [
    {
      titre: 'Ce qui joue en votre faveur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Dans une ville de taille moyenne, l’information circule. Le marché, la mosquée, l’église, le quartier : une pièce trouvée y est signalée à voix haute, et souvent rendue en quelques jours.',
        },
        {
          type: 'liste',
          items: [
            'Le marché central et ses commerçants habituels.',
            'La gare routière, pour les trajets vers Abidjan ou le Nord.',
            'Les quartiers de résidence : Koko, Air France, Dar-es-Salam, N’Gattakro.',
            'Les établissements scolaires et de formation.',
          ],
        },
      ],
    },
    {
      titre: 'Ce qui joue contre vous',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Bouaké est un carrefour. Une part importante des personnes qui y circulent n’y résident pas : elles remontent vers Korhogo, descendent sur Abidjan, ou traversent vers l’Ouest. Le réseau local ne les atteint pas.',
        },
        {
          type: 'encadre',
          titre: 'Un registre national, pas communal',
          texte:
            'Pièci couvre tout le pays. Une pièce perdue à Bouaké et déclarée trouvée à Abidjan vous sera signalée exactement de la même façon — c’est le nom qui fait le rapprochement, pas la géographie.',
        },
      ],
    },
    {
      titre: 'Le cas des autres villes de l’intérieur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le raisonnement vaut partout où la ville est assez grande pour qu’on s’y croise sans se connaître, et assez traversée pour qu’une partie des gens n’y habitent pas.',
        },
        {
          type: 'tableau',
          entetes: ['Ville', 'Ce qui structure les pertes'],
          lignes: [
            ['Yamoussoukro', 'Établissements de formation, administration, axe Abidjan–Nord'],
            ['Korhogo', 'Marché, gare, mouvements saisonniers vers le Sud'],
            ['Daloa', 'Commerce agricole, forte population de passage'],
            ['San-Pédro', 'Port, activité portuaire et logistique'],
            ['Man', 'Carrefour de l’Ouest, transports interurbains'],
            ['Abengourou', 'Marché, proximité de la frontière'],
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Dans tous ces cas, la démarche est la même : chercher sur place là où l’information circule encore, et déclarer en ligne pour rester joignable par ceux que le bouche-à-oreille n’atteint pas.',
        },
      ],
    },
    {
      titre: 'Si vous étiez en voyage',
      blocs: [
        {
          type: 'liste',
          items: [
            'Indiquez la ville où vous pensez avoir perdu la pièce, pas celle où vous habitez.',
            'Précisez la compagnie et le trajet si c’était en car : c’est souvent à ce détail qu’on se reconnaît.',
            'Appelez la gare d’arrivée : les compagnies gardent ce qu’elles trouvent dans leurs véhicules.',
            'Laissez l’alerte active même une fois rentré chez vous : la pièce peut être déclarée depuis n’importe où.',
          ],
        },
      ],
    },
  ],
  connexes: ['piece-perdue-abidjan', 'cni-perdue-que-faire', 'j-ai-trouve-une-cni'],
};
