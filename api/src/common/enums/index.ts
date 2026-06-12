export enum TypePiece {
  CNI = 'CNI',
  PASSEPORT = 'Passeport',
  PERMIS_CONDUIRE = 'Permis de conduire',
  CARTE_ETUDIANTE = 'Carte étudiante',
  CARTE_CONSULAIRE = 'Carte consulaire',
}

export enum TypeLieuDepot {
  MAIRIE = 'mairie',
  COMMISSARIAT = 'commissariat',
  GENDARMERIE = 'gendarmerie',
  POSTE = 'poste',
  PARTENAIRE = 'partenaire',
  AUTRE = 'autre',
}

export enum StatutTrouvaille {
  DISPONIBLE = 'disponible',
  EN_VERIFICATION = 'en_verification',
  RECUPEREE = 'recuperee',
  EXPIREE = 'expiree',
}

export enum StatutAlerte {
  ACTIVE = 'active',
  RESOLUE = 'resolue',
  EXPIREE = 'expiree',
  ANNULEE = 'annulee',
}

export enum StatutCorrespondance {
  SUGGEREE = 'suggeree',
  CONFIRMEE = 'confirmee',
  REJETEE = 'rejetee',
}

export enum NiveauConfiance {
  FORTE = 'forte',
  PROBABLE = 'probable',
  A_VERIFIER = 'a_verifier',
}
