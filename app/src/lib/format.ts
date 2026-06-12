const UN_JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Date relative ("aujourd'hui", "hier", "il y a N jours") à partir d'une
 * date ISO 8601.
 */
export function relDate(iso: string): string {
  const jours = Math.round((Date.now() - new Date(iso).getTime()) / UN_JOUR_MS);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

/**
 * Échappe une chaîne pour une insertion sûre dans du HTML (ex. popups
 * Leaflet construites via template string à partir de saisies utilisateur).
 */
export function echapperHtml(valeur: string): string {
  const div = document.createElement('div');
  div.textContent = valeur;
  return div.innerHTML;
}
