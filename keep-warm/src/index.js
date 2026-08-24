/**
 * Maintien en éveil de l'API Render (palier gratuit).
 *
 * Render endort une instance gratuite après 15 minutes sans trafic ; le
 * réveil coûte ensuite ~33 secondes au premier visiteur. Ce Worker la sollicite
 * toutes les 10 minutes pour qu'elle ne s'endorme jamais pendant les heures où
 * quelqu'un peut déclarer une pièce.
 *
 * Pourquoi PAS 24h/24 : le palier gratuit de Render plafonne à 750 heures
 * d'instance par mois et par espace de travail. Éveil permanent ≈ 730-744 h,
 * soit presque tout le quota — la moindre marge grignotée suspendrait le
 * service. En couvrant 06h-minuit (heure de Côte d'Ivoire = UTC), on tombe à
 * ~547 h/mois : marge confortable, et les heures creuses de la nuit ne portent
 * de toute façon presque aucune déclaration.
 *
 * La cron qui déclenche `scheduled` est déclarée dans wrangler.toml.
 */

const CIBLE_PAR_DEFAUT = 'https://pieci.onrender.com/sante';

async function pinguer(cible) {
  const debut = Date.now();
  try {
    const reponse = await fetch(cible, {
      headers: { 'User-Agent': 'pieci-keep-warm' },
      // Coupe si Render met vraiment trop longtemps : on réessaiera au prochain
      // créneau, inutile de retenir le Worker.
      signal: AbortSignal.timeout(50_000),
    });
    return { ok: reponse.ok, statut: reponse.status, ms: Date.now() - debut };
  } catch (err) {
    return { ok: false, erreur: String(err), ms: Date.now() - debut };
  }
}

export default {
  // Appelé par la cron de wrangler.toml.
  async scheduled(_event, env, ctx) {
    const cible = env.CIBLE_SANTE ?? CIBLE_PAR_DEFAUT;
    ctx.waitUntil(pinguer(cible));
  },

  // Permet de tester à la main en visitant l'URL du Worker.
  async fetch(_request, env) {
    const cible = env.CIBLE_SANTE ?? CIBLE_PAR_DEFAUT;
    const r = await pinguer(cible);
    return new Response(JSON.stringify({ cible, ...r }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};