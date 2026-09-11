import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

export const MESSAGE_SANS_BALISE = 'Les caractères < et > ne sont pas acceptés dans ce champ.';

/** Aucun chevron, ni ouvrant ni fermant. */
export const MOTIF_SANS_BALISE = /^[^<>]*$/;

/**
 * Refuse les chevrons dans un texte libre venu du public.
 *
 * Défense complémentaire, pas défense principale. La protection réelle est
 * l'échappement à la sortie : React échappe tout ce qu'il affiche, et le
 * Worker de bord échappe ce qu'il écrit dans ses `<script>` (voir
 * `jsonPourScript` dans app/worker/index.js). Mais c'est justement un oubli à
 * la sortie qui avait ouvert une faille : une commune envoyée sous la forme
 * « </script><script>… » était recopiée telle quelle dans le <head> de toutes
 * les pages du registre. Refuser les chevrons à l'entrée fait qu'un prochain
 * oubli du même genre ne trouvera rien à exécuter.
 *
 * Aucun nom, prénom ou lieu ivoirien ne contient de chevron : la règle ne
 * coûte rien à personne.
 */
export function SansBalise(): PropertyDecorator {
  return applyDecorators(Matches(MOTIF_SANS_BALISE, { message: MESSAGE_SANS_BALISE }));
}
