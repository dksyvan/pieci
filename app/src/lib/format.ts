/**
 * Formatage — la partie commune vient de `shared/`, ce fichier n'ajoute que ce
 * qui dépend du DOM et ne peut donc pas être partagé avec l'application mobile.
 */
export { cadrer, formaterTelephone, relDate } from '@partage/format';

/**
 * Échappe une chaîne pour une insertion sûre dans du HTML.
 *
 * Propre au web : les popups Leaflet sont construites par concaténation de
 * chaînes à partir de saisies utilisateur. L'application mobile n'en a pas
 * besoin — `react-native-maps` reçoit des props, pas du balisage.
 */
export function echapperHtml(valeur: string): string {
  const div = document.createElement('div');
  div.textContent = valeur;
  return div.innerHTML;
}
