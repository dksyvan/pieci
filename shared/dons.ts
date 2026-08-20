/**
 * Coordonnées de soutien. Pièci est gratuit et le sera toujours : ces dons couvrent
 * l'hébergement, le nom de domaine et les frais d'envoi des notifications.
 *
 * Pour modifier un numéro, c'est ici et nulle part ailleurs.
 */

/** Espace insécable — les groupes de chiffres ne doivent jamais se couper. */
const INSECABLE = ' ';

export interface Operateur {
  /** Identifiant stable, sert de clé React et d'ancre de test. */
  id: string;
  nom: string;
  /** Numéro brut, sans espaces — c'est lui qui part dans le presse-papier. */
  numero: string;
  /** Le nom du compte, tel qu'il s'affichera à l'expéditeur. */
  titulaire: string;
  note?: string;
}

export const TITULAIRE = 'DIBY Yvan';

export const OPERATEURS: Operateur[] = [
  {
    id: 'wave',
    nom: 'Wave',
    numero: '0556043891',
    titulaire: TITULAIRE,
    note: 'Transfert sans frais',
  },
  {
    id: 'mtn',
    nom: 'MTN MoMo',
    numero: '0556043891',
    titulaire: TITULAIRE,
  },
  {
    id: 'orange',
    nom: 'Orange Money',
    numero: '0703973946',
    titulaire: TITULAIRE,
  },
];

/**
 * Lien de paiement Wave (compte marchand) — ouvre l'application Wave, où le
 * donateur saisit lui-même le montant. Si la valeur repasse à `null`, le
 * bouton disparaît et seuls les numéros à copier restent proposés.
 */
export const LIEN_WAVE: string | null = 'https://pay.wave.com/m/M_ci_IxnvsXB2xY6p/c/ci/';

/** Montants suggérés, en francs CFA. */
export const MONTANTS = [500, 1000, 2000, 5000] as const;

/** `0556043891` → `05 56 04 38 91` */
export function formaterNumero(numero: string): string {
  return numero.replace(/(\d{2})(?=\d)/g, `$1${INSECABLE}`).trim();
}

/** `1000` → `1 000 F CFA` */
export function formaterMontant(montant: number): string {
  const groupe = String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, INSECABLE);
  return `${groupe}${INSECABLE}F${INSECABLE}CFA`;
}
