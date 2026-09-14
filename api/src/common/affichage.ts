/**
 * Affichage public d'une identité : NOM en capitales, initiales du prénom.
 *
 * Trois écritures de la même règle existent, et elles doivent rester
 * identiques : la vue SQL `v_pieces_trouvees_publiques` (qui est la vraie
 * frontière — le prénom entier n'en sort jamais), `shared/partage.ts` pour le
 * site, et ce fichier pour l'API. L'API ne peut pas importer `shared/` : elle
 * se compile sans l'alias du site, comme `common/telephone.ts`.
 *
 * Les tests des trois portent la même table de cas.
 */

/**
 * Initiales d'un prénom, séparateurs conservés.
 *
 * « Serge-Yvan » → « S-Y. », « Marie Ange » → « M.A. », « N'Da » → « N. » :
 * le tiret reste un tiret, les espaces deviennent un point, et l'apostrophe
 * n'est pas un séparateur. Écrit comme la vue SQL — première lettre de chaque
 * jeton, puis espaces remplacés — pour que les deux produisent la même chose
 * sur les cas limites (« Jean--Marc » → « J--M. » des deux côtés).
 *
 * Renvoie `null` pour un prénom vide : l'affichage se réduit alors au nom.
 */
export function initialesPrenom(prenom: string | null | undefined): string | null {
  const propre = (prenom ?? '').trim();
  if (!propre) return null;

  const initiales = propre
    .replace(/([^\s-])[^\s-]*/gu, '$1')
    .replace(/\s+/g, '.')
    .replace(/\.+$/, '')
    .toUpperCase();

  return initiales ? `${initiales}.` : null;
}

/** « N'Guessan », « Adjoua » → « N'GUESSAN A. ». Jamais les deux en entier. */
export function nomAffiche(nom: string | null | undefined, prenom: string | null | undefined): string {
  const patronyme = (nom ?? '').trim().toUpperCase();
  const initiales = initialesPrenom(prenom);
  return initiales ? `${patronyme} ${initiales}`.trim() : patronyme;
}
