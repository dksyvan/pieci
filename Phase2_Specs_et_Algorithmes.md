# Pièci — Phase 2 : Spécifications & logique métier

*Document technique — PM + CTO + Dev Backend — Juin 2026*

---

## 1. Parcours utilisateurs (user stories)

**Celui qui trouve (le bon samaritain)**
> En tant que personne ayant trouvé une pièce, je veux publier une déclaration en moins d'une minute (type de pièce, nom visible, commune, position, photo) afin que le propriétaire soit prévenu automatiquement, sans exposer publiquement ses données sensibles.

**Celui qui a perdu**
> En tant que personne ayant perdu sa pièce, je veux créer une alerte (mon nom, type, dernière zone connue) afin d'être **notifié automatiquement** dès qu'une pièce correspondante est déclarée — sans devoir surveiller un fil en permanence.

**Le visiteur**
> En tant que visiteur, je veux parcourir et filtrer les pièces trouvées (par type, par commune) et les voir sur une carte, afin de vérifier rapidement si la mienne y figure.

---

## 2. Modèle de données (simplifié)

```
Trouvaille {
  id, typePiece, nom, prenom (partiel),
  commune, lat, lng,
  dateTrouvee, pointDepot,
  photoFloutee: bool,
  contact (révélé après match)
}

AlertePerte {
  id, typePiece, nom, prenom,
  communeProbable, lat, lng,
  dateCreation, contact
}
```

**Confidentialité by design** : en public, on n'affiche que `prénom + initiale du nom + type + commune + date relative + photo floutée`. Le numéro de pièce et le nom complet ne sont **jamais** publics. Le contact se révèle uniquement entre les deux parties d'un match confirmé.

---

## 3. Algorithme de matching (cœur métier)

Le rapprochement perte ↔ trouvaille repose sur un **score de confiance** combinant quatre signaux pondérés. L'enjeu : tolérer les fautes d'orthographe, les variantes de noms ivoiriens et les erreurs de lecture (OCR/saisie), tout en restant rapide.

### 3.1 Signaux et pondérations

| Signal | Poids | Méthode |
|---|---|---|
| Similarité du **nom** | 45 % | Normalisation (sans accents, casse) + similarité de Levenshtein + correspondance par jetons |
| Similarité du **prénom** | 20 % | Idem nom |
| **Type de pièce** | 20 % | Correspondance exacte (filtre quasi-obligatoire) |
| **Proximité géographique** | 10 % | Distance de Haversine + décroissance exponentielle |
| **Proximité temporelle** | 5 % | Décroissance sur l'écart de dates |

### 3.2 Normalisation des noms

```
normaliser("Kouassi Aké") → "kouassi ake"
```
- minuscules, suppression des accents/diacritiques, espaces compactés.
- gère « N'Guessan / Nguessan », « Aké / Ake », « Koffi / Kofi ».

### 3.3 Similarité de chaînes

On combine deux mesures pour la robustesse :
1. **Ratio de Levenshtein** : `1 - distance / max(len)` → tolère les fautes de frappe.
2. **Similarité par ensemble de jetons** : intersection des mots / union → tolère l'ordre (nom/prénom inversés) et les mots manquants.

Score final nom = `max(ratioLevenshtein, similariteJetons)`.

### 3.4 Distance géographique (Haversine)

```
d = 2R · asin( √( sin²(Δφ/2) + cosφ₁·cosφ₂·sin²(Δλ/2) ) )
proximité = exp( -d / 25 )      // ~échelle 25 km
```

### 3.5 Score global

```
score = 0.45·simNom + 0.20·simPrenom + 0.20·simType
      + 0.10·proxGeo + 0.05·proxTemps
```
- Match affiché si `score ≥ 0.55`, trié par score décroissant.
- Bandes de confiance : ≥ 0,80 *forte* · 0,65–0,80 *probable* · 0,55–0,65 *à vérifier*.

### 3.6 Performance & passage à l'échelle

- **Prototype** : comparaison directe O(n·m) — instantané sur quelques milliers d'entrées.
- **Production** : *blocking* — on ne compare que les entrées partageant le même `typePiece` et la même région (index par clé `typePiece|commune`), réduisant drastiquement le nombre de comparaisons. La similarité de noms peut être pré-filtrée par phonétique (type Soundex adapté aux noms francophones/ivoiriens).

---

## 4. Géolocalisation

- Bouton **« Utiliser ma position »** → API `navigator.geolocation` du navigateur.
- Repli manuel : sélection de la commune (coordonnées pré-renseignées pour les communes d'Abidjan + grandes villes).
- **Carte interactive** (Leaflet + OpenStreetMap) affichant les pièces trouvées (repères orange) et les **points de dépôt sécurisés** (repères verts : commissariats, mairies, partenaires) — pour récupérer sa pièce sans rencontre privée risquée.

---

## 5. Écrans du prototype

1. **Accueil** — proposition de valeur, statistiques, double appel à l'action.
2. **Pièces trouvées** — fil filtrable (type, commune) + recherche, cartes anonymisées.
3. **Carte** — pièces + points de dépôt géolocalisés.
4. **J'ai trouvé** — formulaire de déclaration (avec position et floutage).
5. **J'ai perdu** — création d'alerte → exécution du matching → résultats classés par confiance.
