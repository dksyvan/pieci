import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Met les numéros déjà en base à la forme canonique : dix chiffres, sans
 * espace ni indicatif pays.
 *
 * Pourquoi c'est nécessaire : l'API compare les numéros en chaîne exacte
 * (`findOne where telephone`). Tant que « +225 07 87 96 04 70 » et
 * « 0787960470 » cohabitaient, ils désignaient deux comptes distincts —
 * celui qui déclarait sous une forme et cherchait sous l'autre ne retrouvait
 * rien, et se créait un doublon au passage. Depuis `EstTelephone()`, toute
 * nouvelle écriture est canonique ; cette migration rattrape les anciennes,
 * sans quoi elles deviendraient définitivement introuvables.
 *
 * `points_depot.telephone` reste hors périmètre : c'est un numéro de contact
 * public — une mairie, un commissariat — pas une clé de compte, et rien ne
 * garantit qu'il tienne en dix chiffres.
 */
export class NormaliserTelephones1750000000000 implements MigrationInterface {
  name = 'NormaliserTelephones1750000000000';

  /**
   * Expression SQL miroir de `normaliserTelephone()`
   * (`api/src/common/telephone.ts`, `shared/telephone.ts`).
   *
   * L'indicatif n'est retiré que s'il laisse un numéro complet : un numéro
   * local commençant par 225 serait sinon amputé de trois chiffres.
   */
  private readonly canonique = (colonne: string) => `
    CASE
      WHEN length(regexp_replace(${colonne}, '\\D', '', 'g')) = 13
       AND regexp_replace(${colonne}, '\\D', '', 'g') LIKE '225%'
      THEN substring(regexp_replace(${colonne}, '\\D', '', 'g') FROM 4)
      ELSE regexp_replace(${colonne}, '\\D', '', 'g')
    END`;

  /** Tables où le téléphone identifie une personne. */
  private readonly tables = ['utilisateurs', 'push_subscriptions', 'expo_push_tokens'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      const [{ existe }] = (await queryRunner.query(
        `SELECT to_regclass('${table}') IS NOT NULL AS existe`,
      )) as Array<{ existe: boolean }>;
      if (!existe) continue;

      // Garde-fou : deux lignes qui se ramènent au même numéro sont deux
      // personnes que rien ne permet de départager ici. Fusionner à l'aveugle
      // mélangerait leurs pièces et leurs alertes ; on préfère s'arrêter et
      // laisser un humain trancher. `utilisateurs.telephone` étant unique,
      // l'UPDATE échouerait de toute façon — autant échouer en expliquant.
      const collisions = (await queryRunner.query(`
        SELECT ${this.canonique('telephone')} AS canonique, count(*) AS n
          FROM ${table}
         GROUP BY 1
        HAVING count(*) > 1
      `)) as Array<{ canonique: string; n: string }>;

      if (collisions.length > 0) {
        const details = collisions
          .map((c) => `${c.canonique} (${c.n} lignes)`)
          .join(', ');
        throw new Error(
          `Normalisation impossible sur « ${table} » : ces numéros existent en double ` +
            `une fois normalisés — ${details}. Fusionnez ou supprimez ces comptes à la ` +
            `main, puis relancez la migration.`,
        );
      }

      // Une normalisation qui ne tombe pas sur dix chiffres signale une ligne
      // déjà cassée avant cette migration — une saisie « 00225… », un champ
      // rempli à la main. On la laisse passer plutôt que de bloquer un
      // déploiement pour un défaut antérieur, mais on le dit.
      const suspectes = (await queryRunner.query(`
        SELECT count(*)::int AS n
          FROM ${table}
         WHERE length(${this.canonique('telephone')}) <> 10
      `)) as Array<{ n: number }>;

      if (suspectes[0].n > 0) {
        console.warn(
          `[NormaliserTelephones] « ${table} » : ${suspectes[0].n} numéro(s) ne font pas ` +
            `dix chiffres après normalisation. Ces comptes étaient déjà inatteignables ; ` +
            `ils le restent. À examiner à la main.`,
        );
      }

      // Une seule écriture, uniquement sur les lignes qui en ont besoin.
      await queryRunner.query(`
        UPDATE ${table}
           SET telephone = ${this.canonique('telephone')}
         WHERE telephone <> ${this.canonique('telephone')}
      `);
    }
  }

  /**
   * Irréversible, et c'est assumé : la forme d'origine — les espaces, le
   * « +225 » — n'est stockée nulle part une fois écrasée. Restaurer
   * demanderait de deviner, et une supposition ici recasserait les comptes
   * que la migration vient de réparer.
   */
  public async down(): Promise<void> {
    // Rien à défaire.
  }
}
