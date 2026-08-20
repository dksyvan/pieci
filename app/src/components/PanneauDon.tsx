import { useEffect, useState } from 'react';
import {
  LIEN_WAVE,
  MONTANTS,
  OPERATEURS,
  formaterMontant,
  formaterNumero,
} from '@partage/dons';
import { IconeCopier, IconeFleche, IconeValide } from './Icones';

interface Props {
  /** Titre du bandeau. Varie selon l'endroit d'où l'on arrive. */
  titre?: string;
  /** Phrase d'accroche, une seule, jamais deux. */
  intro?: string;
}

/**
 * Coordonnées de soutien. Aucun paiement ne transite par Pièci : l'utilisateur
 * copie un numéro et envoie depuis son application mobile money, ou passe par
 * le lien Wave si un compte marchand est configuré.
 */
export function PanneauDon({ titre = 'Soutenir Pièci', intro }: Props) {
  const [copie, setCopie] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);
  /** `null` : rien choisi · `'libre'` : montant laissé à l'appréciation du donateur. */
  const [montant, setMontant] = useState<number | 'libre' | null>(null);

  useEffect(() => {
    if (!copie) return;
    const t = setTimeout(() => setCopie(null), 2400);
    return () => clearTimeout(t);
  }, [copie]);

  const copier = async (id: string, numero: string) => {
    setEchec(false);
    try {
      await navigator.clipboard.writeText(numero);
      setCopie(id);
    } catch {
      setEchec(true);
    }
  };

  return (
    <div className="panneau">
      <div className="panneau-tete">
        <h3 style={{ fontSize: 'var(--t-sub)', letterSpacing: '-0.03em' }}>{titre}</h3>
        <span className="cote">Facultatif</span>
      </div>

      <p style={{ color: 'var(--color-sourdine)', maxWidth: '52ch', lineHeight: 'var(--lh-lead)' }}>
        {intro ??
          'Pièci est gratuit et ça le sera toujours. Les dons servent à payer l’hébergement, le nom de domaine et l’envoi des notifications.'}
      </p>

      <fieldset style={{ border: 0, padding: 0, margin: 'var(--s-4) 0 0' }}>
        <legend className="label" style={{ marginBottom: 7 }}>
          Montant suggéré
        </legend>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MONTANTS.map((m) => (
            <button
              key={m}
              type="button"
              className={'jeton' + (montant === m ? ' actif' : '')}
              aria-pressed={montant === m}
              onClick={() => setMontant(montant === m ? null : m)}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formaterMontant(m)}
            </button>
          ))}
          <button
            type="button"
            className={'jeton' + (montant === 'libre' ? ' actif' : '')}
            aria-pressed={montant === 'libre'}
            onClick={() => setMontant(montant === 'libre' ? null : 'libre')}
          >
            Autre
          </button>
        </div>
        <p className="aide">
          {montant === null
            ? 'Le montant se tape dans ton application, pas ici.'
            : montant === 'libre'
              ? 'Envoie ce que tu peux — même 200 F, ça compte.'
              : `Envoie ${formaterMontant(montant)} au numéro de ton choix ci-dessous.`}
        </p>
      </fieldset>

      {LIEN_WAVE && (
        <a
          className="btn btn-cachet btn-large"
          href={LIEN_WAVE}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: 'var(--s-4)' }}
        >
          Payer avec Wave
          <IconeFleche taille={15} />
        </a>
      )}

      <div className="lignes" style={{ marginTop: 'var(--s-4)' }}>
        {OPERATEURS.map((op) => {
          const estCopie = copie === op.id;
          return (
            <div className="ligne" key={op.id} style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <div className="ligne-nom" style={{ fontSize: '0.9375rem' }}>
                  {op.nom}
                </div>
                <div className="donnee" style={{ marginTop: 3, fontSize: '0.9375rem', letterSpacing: '0.06em' }}>
                  {formaterNumero(op.numero)}
                </div>
                <div className="ligne-meta">
                  {op.titulaire}
                  {op.note ? ` · ${op.note}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => copier(op.id, op.numero)}
                aria-label={`Copier le numéro ${op.nom} : ${formaterNumero(op.numero)}`}
                style={{ alignSelf: 'center', minWidth: 118 }}
              >
                {estCopie ? <IconeValide taille={15} /> : <IconeCopier taille={15} />}
                {estCopie ? 'Copié' : 'Copier'}
              </button>
            </div>
          );
        })}
      </div>

      {echec && (
        <p className="erreur" role="alert">
          Ton navigateur bloque la copie automatique. Sélectionne le numéro à la main, il reste juste
          au-dessus.
        </p>
      )}

      <p className="aide" style={{ marginTop: 'var(--s-3)' }}>
        Aucun paiement ne passe par Pièci : le transfert se fait directement d’une application à
        l’autre. Nous ne voyons ni ton solde, ni ton historique.
      </p>
    </div>
  );
}
