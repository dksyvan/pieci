# Pièci — Dossier Phase 1
### Plateforme de mise en relation pour pièces d'identité égarées en Côte d'Ivoire

*Document de cadrage — Juin 2026*

---

## 1. Brainstorm marché & opportunité

### 1.1 Le problème réel

En Côte d'Ivoire, retrouver une pièce d'identité égarée repose aujourd'hui sur un mécanisme informel : celui qui trouve une pièce la prend en photo, la met en **statut WhatsApp**, et compte sur le repartage de proche en proche. Ce système, bien que porté par une vraie solidarité, est structurellement inefficace :

- **Éphémère** : un statut WhatsApp disparaît au bout de 24 heures.
- **Cercle limité** : il ne touche que les contacts directs de celui qui poste.
- **Non cherchable** : impossible pour une personne qui a perdu sa pièce de « chercher » si quelqu'un l'a retrouvée.
- **Aléatoire** : la mise en relation dépend uniquement de la chance (qu'une connaissance commune voie le statut).

> **Insight central** : le problème n'est pas le manque de bonne volonté — elle est massive. Le problème est que **l'information n'est ni permanente, ni cherchable, ni géolocalisée**. Pièci transforme un canal *broadcast éphémère* (le statut) en une *base de données cherchable et durable*.

### 1.2 Taille et maturité du marché

| Indicateur | Valeur | Source |
|---|---|---|
| Utilisateurs WhatsApp actifs (CI) | ~7 millions (pénétration 23,9%) | Meta / FratMat, T1 2025 |
| Abonnés internet mobile | 25,1 millions (pénétration 89,7%) | ARTCI, 2024 |
| Couverture 4G | ~93,7% | ARTCI |
| Capacité d'enrôlement CNI / jour | 100 000 personnes/jour | ONECI |

Le comportement « je poste ce que j'ai trouvé » **existe déjà à grande échelle**. Pièci ne crée pas une nouvelle habitude — il **canalise une habitude existante** vers un outil plus performant. C'est un avantage stratégique majeur : l'adoption ne nécessite pas de changement de comportement profond, juste un meilleur canal.

### 1.3 Importance pour la population

Une pièce d'identité (CNI, passeport, permis, carte étudiante, carte consulaire) est indispensable au quotidien : retraits bancaires, démarches administratives, examens, déplacements, emploi. La perdre, c'est souvent payer un duplicata, perdre du temps, et parfois rater une opportunité. Depuis septembre 2025, les démarches CNI se sont d'ailleurs durcies (certificat de nationalité en ligne obligatoire) — refaire une pièce coûte plus cher en temps et en argent. **Retrouver l'original a donc une valeur concrète et croissante.**

### 1.4 La vraie valeur produit : le matching, pas la déclaration

Le piège serait de réduire Pièci à « un mur où on poste des pièces trouvées ». La valeur différenciante, c'est le **rapprochement automatique** :

1. Une personne **perd** sa pièce → elle crée une *alerte de recherche* (nom, type, zone).
2. Une personne **trouve** une pièce → elle publie une *déclaration de trouvaille*.
3. L'algorithme **rapproche** automatiquement les deux et **notifie les deux parties**.

Le propriétaire n'a même pas besoin de chercher activement : le système le prévient. **C'est ce que WhatsApp ne pourra jamais faire.**

### 1.5 Risque n°1 : confiance & vie privée

Une pièce d'identité contient des données sensibles (numéro, date de naissance, adresse). Exposer ces données en public ouvrirait la porte à l'usurpation et à la fraude.

> **Règle d'or produit** : afficher le **strict minimum** en public (prénom partiel + type de pièce + zone + photo partiellement floutée). Les détails ne se révèlent **qu'après mise en relation confirmée**. C'est à la fois une protection et un argument marketing : *« la façon sûre de retrouver sa pièce »*.

### 1.6 Idées générées (et triées)

**Directions fortes retenues :**
- **Matching automatique perte ↔ trouvaille** avec notifications. *(cœur du produit)*
- **Géolocalisation des points de dépôt** (commissariats, mairies, partenaires) pour récupérer la pièce sans rencontre privée risquée.
- **Floutage automatique** des données sensibles sur les photos publiées.

**Idées parquées (intéressantes, plus tard) :**
- Partenariat institutionnel avec l'ONECI / mairies / police.
- Programme de « bons samaritains » (badge, gamification de la restitution).
- Extension aux objets perdus (téléphones, clés, cartes bancaires).
- Version USSD/SMS pour les non-smartphones.

**Hypothèse la plus risquée à tester en premier :** les gens qui trouvent une pièce accepteront-ils de faire la démarche sur l'app plutôt que sur WhatsApp ? → à valider avec un prototype et 10–15 utilisateurs réels.

---

## 2. Identité de marque

### 2.1 Nom recommandé : **Pièci**

Jeu de mots entre **« pièce »** et **« ici / CI »** → *« ta pièce est ici »*, et *« en Côte d'Ivoire »*.

- Court (5 lettres), mémorable, se prononce « pié-si ».
- Contient littéralement le mot « pièce » → clarté immédiate.
- Domaine `pieci.ci` naturel et cohérent.
- Sonorité chaleureuse, locale, facile à dire au marché.

**Slogan :** *« Ta pièce retrouvée. »*
**Variante CM (nouchi léger) :** *« On a vu ta pièce, viens prendre ! »*

#### Alternatives (au choix)
| Nom | Logique | Ton |
|---|---|---|
| **Retrouvé.ci** | Clair, descriptif, rassurant | Sobre / institutionnel |
| **Akwaba ID** | « Akwaba » = bienvenue (baoulé) → la pièce revient à la maison | Chaleureux / ivoirien |
| **Kpata** | Argot abidjanais = « nickel, parfait » → quand tu retrouves, c'est kpata | Fun / jeune |
| **Yako** | Expression d'empathie ivoirienne | Solidaire |

### 2.2 Charte graphique

**Plateforme de couleurs** (inspirée du drapeau ivoirien, modernisée) :

| Rôle | Couleur | Hex | Usage |
|---|---|---|---|
| Primaire | Orange Akwaba | `#F77F2E` | Énergie, identité CI, boutons d'action |
| Secondaire | Vert Retrouvé | `#13A05C` | Succès, confiance, états « retrouvé » |
| Fond sombre | Bleu Nuit | `#0F2A43` | Texte, en-têtes, sérieux/confiance |
| Neutre clair | Blanc Cassé | `#F7F5F0` | Arrière-plans |
| Accent | Jaune Soleil | `#FFC542` | Badges, mises en avant ponctuelles |
| Alerte | Rouge Doux | `#E5484D` | Erreurs, urgences |

**Logique** : l'orange porte l'énergie et l'identité ivoirienne ; le vert signale le succès (« retrouvé »), créant un fil émotionnel fort ; le bleu nuit ancre la confiance, indispensable pour une app qui manipule des données d'identité.

**Typographie :**
- Titres : **Sora** ou **Poppins** (géométrique, moderne, amical).
- Corps : **Inter** (lisibilité maximale sur mobile).
- Accents/chiffres : **Sora SemiBold**.

**Logo** : un **repère de localisation (pin)** dont l'intérieur forme une **carte d'identité** marquée d'une **coche verte** → « ta pièce, localisée et retrouvée ». Décliné en version icône (favicon, app), version horizontale (web), et monochrome.

**Ton de voix :**
- **Confiance** dans les écrans sensibles (sécurité, données) → français clair et rassurant.
- **Chaleur et proximité** dans la communication (CM, notifications) → touches de nouchi maîtrisées.
- Toujours : humain, solidaire, jamais bureaucratique.

---

## 3. Organigramme de la startup & répartition des tâches

```
                         ┌───────────────┐
                         │      CEO       │
                         │  Vision, levée │
                         │  partenariats  │
                         └───────┬───────┘
                                 │
        ┌────────────────┬───────┴────────┬──────────────────┐
        │                │                │                  │
   ┌────┴────┐     ┌─────┴─────┐    ┌─────┴──────┐    ┌──────┴───────┐
   │   CTO   │     │    PM      │    │ Resp.      │    │  Community    │
   │ Archi,  │     │ Specs,     │    │ Marketing  │    │  Manager      │
   │ sécurité│     │ priorités  │    │ Acquisition│    │  Animation    │
   └────┬────┘     └─────┬──────┘    └────────────┘    └──────────────┘
        │                │
   ┌────┴─────┬──────────┴───┐
   │          │              │
┌──┴───┐  ┌───┴────┐    ┌────┴────┐
│ Dev   │  │  Dev   │    │ (QA/    │
│Frontend│ │Backend │    │ Design) │
└───────┘  └────────┘    └─────────┘
```

### Rôles & responsabilités (répartition des tâches)

| Rôle | Mission | Livrables Phase 1–2 |
|---|---|---|
| **CEO** | Vision, modèle, partenariats (ONECI, mairies, police), levée de fonds | Pitch, vision produit, plan partenariats |
| **CTO** | Architecture technique, sécurité des données, choix de stack | Schéma d'architecture, politique de confidentialité technique, choix React + backend |
| **PM** | Spécifications, parcours utilisateurs, priorisation, backlog | Specs fonctionnelles, user stories, roadmap |
| **Dev Frontend** | Interface React, géolocalisation, expérience utilisateur | Prototype React soigné et responsive |
| **Dev Backend** | Logique de matching, API, base de données, notifications | Algorithme de matching, modèle de données |
| **Resp. Marketing** | Acquisition, positionnement, partenariats médias | Plan de lancement, messages clés |
| **Community Manager** | Animation des réseaux, modération, relation utilisateurs | Calendrier éditorial, ton de marque, FAQ |

> Note d'exécution : dans ce projet, ces rôles sont incarnés successivement (« par rôle ») pour produire chaque livrable de façon cohérente, plutôt que par des agents séparés.

---

## 4. Mapping des compétences (skills) par rôle

Plutôt que de créer de nouvelles compétences (non persistables ici), le projet s'appuie sur les compétences existantes les mieux adaptées à chaque rôle :

| Rôle | Compétences mobilisées |
|---|---|
| PM | `product-management:brainstorm`, `product-management:write-spec`, `product-management:sprint-planning` |
| CTO | `engineering:system-design`, `engineering:architecture`, `engineering:testing-strategy` |
| Dev Frontend | `web-artifacts-builder`, React (prototype), `algorithmic-art` (visuels de marque) |
| Dev Backend | `engineering:system-design`, conception d'algorithmes (matching, géolocalisation) |
| Design | `design:design-system`, `design:ux-copy`, `design:accessibility-review`, `canvas-design` |
| Marketing | `marketing:campaign-plan`, `marketing:content-creation`, `marketing:seo-audit` |
| Community Manager | `marketing:draft-content`, `postiz` (programmation réseaux sociaux) |
| Documents | `docx`, `pdf`, `pptx` (pitch deck) |

---

## 5. Prochaines étapes (Phase 2)

1. **PM + CTO** : specs fonctionnelles détaillées + conception des algorithmes (matching perte↔trouvaille, scoring géolocalisé).
2. **Dev Frontend** : prototype React (interface soignée, non générique, géolocalisation, données simulées).
3. **Marketing + CM** : plan de lancement.

*Validation attendue avant de lancer la Phase 2 : nom retenu et charte graphique approuvée.*
