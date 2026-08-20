const UN_JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Date relative (« aujourd'hui », « hier », « il y a N jours ») à partir d'une
 * date ISO 8601.
 */
export function relDate(iso: string): string {
  const jours = Math.round((Date.now() - new Date(iso).getTime()) / UN_JOUR_MS);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

/**
 * `0700000000` → `07 00 00 00 00`. Espaces insécables : un numéro de téléphone
 * ne doit jamais se couper en fin de ligne.
 */
export function formaterTelephone(numero: string): string {
  const chiffres = numero.replace(/\D/g, '');
  if (chiffres.length !== 10) return numero;
  return chiffres.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

/** `4` → `0004` — les compteurs du registre sont cadrés sur quatre chiffres. */
export function cadrer(valeur: number, largeur = 4): string {
  return String(valeur).padStart(largeur, '0');
}
