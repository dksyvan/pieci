/** Coordonnées de l'autre partie, révélées une fois la correspondance confirmée. */
export interface ContactDto {
  prenom: string;
  nom: string;
  telephone: string;
  email: string | null;
}
