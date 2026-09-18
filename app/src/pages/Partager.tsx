import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORIGINE, lienFacebook, lienWhatsApp } from '@partage/partage';
import {
  COMMUNES_CITABLES,
  MOMENTS,
  REGLES,
  lienDuMessage,
  texteDuMessage,
  type Moment,
} from '../contenu/partage-groupe';
import {
  IconeCopier,
  IconeFacebook,
  IconeFleche,
  IconePartage,
  IconeValide,
  IconeWhatsApp,
} from '../components/Icones';

type Copie = 'repos' | 'faite' | 'echec';

/**
 * L'écran qui sert à poster Pièci dans un groupe.
 *
 * Le registre attend qu'on vienne à lui, et presque personne ne vient :
 * quelqu'un qui ramasse une pièce à Yopougon la photographie et la publie
 * dans le groupe WhatsApp du quartier, où le post disparaît en trois heures.
 * Cette page arme un membre du groupe pour qu'il y réponde — c'est lui qui
 * peut parler là-bas, pas nous.
 *
 * Elle ne fabrique donc pas une annonce : elle propose une réponse, au bon
 * moment, avec le bon lien, et laisse la personne la réécrire. Les conseils
 * de la colonne de droite valent autant que le bouton d'envoi : un lien collé
 * à froid se fait supprimer, et c'est le nom de Pièci qui reste associé au
 * spam dans la tête des administrateurs du groupe.
 */
export function Partager() {
  const [moment, setMoment] = useState<Moment>('trouvee');
  const [commune, setCommune] = useState('');
  /** Le texte réécrit à la main, quand il l'a été. `null` = celui qu'on propose. */
  const [reecrit, setReecrit] = useState<string | null>(null);
  const [copie, setCopie] = useState<Copie>('repos');

  // L'origine réelle plutôt que l'origine publique : un lien de préproduction
  // qui renverrait sur la production ne se testerait pas.
  const origine = typeof window === 'undefined' ? ORIGINE : window.location.origin;

  const propose = texteDuMessage(moment, commune, origine);
  const message = reecrit ?? propose;
  const url = lienDuMessage(moment, commune, origine);

  /** Changer de situation change le message : on repart de celui qu'on propose. */
  const choisirMoment = (cle: Moment) => {
    setMoment(cle);
    setReecrit(null);
  };

  const choisirCommune = (valeur: string) => {
    setCommune(valeur);
    setReecrit(null);
  };

  const copier = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(message);
      setCopie('faite');
      setTimeout(() => setCopie('repos'), 4000);
      return true;
    } catch {
      setCopie('echec');
      return false;
    }
  };

  /**
   * Facebook n'accepte pas de texte pré-rempli — il ne prend que l'adresse, et
   * jette tout le reste depuis des années. Plutôt que d'ouvrir une fenêtre
   * vide en laissant croire à un bug, on copie le message avant d'ouvrir : il
   * ne reste qu'à le coller.
   */
  const versFacebook = async () => {
    await copier();
    window.open(lienFacebook(url), '_blank', 'noopener,noreferrer');
  };

  const partageNatif =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      ? () => {
          void navigator.share({ text: message, url }).catch(() => {});
        }
      : null;

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Faire venir les déclarations</span>
        <h2 style={{ marginTop: 6 }}>Partager Pièci dans un groupe</h2>
        <p>
          Une pièce ramassée finit presque toujours dans un groupe WhatsApp ou Facebook, en photo,
          où l’annonce disparaît en quelques heures. C’est là qu’il faut être — et c’est toi qui
          peux y aller. Choisis la situation, relis le message, envoie.
        </p>
      </div>

      <div className="grille" style={{ rowGap: 'var(--s-5)' }}>
        <div className="col-a">
          <div className="champ">
            <label id="moment-label">Dans quelle situation&nbsp;?</label>
            <div className="moments" role="group" aria-labelledby="moment-label">
              {MOMENTS.map((m) => (
                <button
                  key={m.cle}
                  type="button"
                  className={`moment${moment === m.cle ? ' actif' : ''}`}
                  aria-pressed={moment === m.cle}
                  onClick={() => choisirMoment(m.cle)}
                >
                  <span className="moment-titre">{m.libelle}</span>
                  <span className="moment-quand">{m.quand}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="champ">
            <label htmlFor="commune-groupe">De quel coin parle ce groupe&nbsp;?</label>
            <select
              id="commune-groupe"
              value={commune}
              onChange={(e) => choisirCommune(e.target.value)}
            >
              <option value="">Toute la Côte d’Ivoire</option>
              {COMMUNES_CITABLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="aide">
              {moment === 'presentation'
                ? 'Le message citera cette commune et mènera à son registre.'
                : 'Sans effet ici : ce message mène au formulaire, qui demandera le lieu exact.'}
            </p>
          </div>

          {/* Le message est montré en entier et modifiable : personne ne parle à
              son groupe comme une marque parle à un public, et rien ne part au
              nom de quelqu'un sans qu'il ait lu ce qui part. */}
          <div className="champ">
            <label htmlFor="message-groupe">Le message</label>
            <textarea
              id="message-groupe"
              rows={8}
              value={message}
              onChange={(e) => setReecrit(e.target.value)}
            />
            <p className="aide">
              Réécris-le comme tu parles. {reecrit !== null && (
                <button type="button" className="lien" onClick={() => setReecrit(null)}>
                  Revenir au texte proposé
                </button>
              )}
            </p>
          </div>

          <div className="rangee-partage">
            <a
              className="btn btn-plein"
              href={lienWhatsApp(message)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconeWhatsApp taille={16} />
              WhatsApp
            </a>
            <button type="button" className="btn" onClick={() => void versFacebook()}>
              <IconeFacebook taille={16} />
              Facebook
            </button>
            <button type="button" className="btn" onClick={() => void copier()}>
              {copie === 'faite' ? <IconeValide taille={16} /> : <IconeCopier taille={16} />}
              {copie === 'faite' ? 'Copié' : 'Copier'}
            </button>
            {partageNatif && (
              <button
                type="button"
                className="btn"
                onClick={partageNatif}
                aria-label="Partager autrement"
              >
                <IconePartage taille={16} />
                Autre
              </button>
            )}
          </div>

          <p className="aide" style={{ marginTop: 'var(--s-2)' }}>
            Facebook ne pré-remplit pas le texte, c’est ainsi depuis des années : le message est
            copié au moment où la fenêtre s’ouvre, il n’y a qu’à le coller.
          </p>

          {copie === 'echec' && (
            <p className="erreur" role="alert">
              Le presse-papiers a refusé. Sélectionne le message ci-dessus et copie-le à la main.
            </p>
          )}
        </div>

        <aside className="col-b">
          <div className="panneau">
            <div className="panneau-tete">
              <span className="label">Avant de coller ça quelque part</span>
              <span className="cote">À lire</span>
            </div>
            <ol className="regles">
              {REGLES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </div>

          <div className="vide" style={{ marginTop: 'var(--s-5)' }}>
            <h3>Tu as toi-même trouvé une pièce&nbsp;?</h3>
            <p>
              Alors ne la partage pas en photo : déclare-la. Le numéro est flouté avant publication
              et ton téléphone n’est jamais affiché.
            </p>
            <Link to="/declarer" className="lien" style={{ marginTop: 'var(--s-3)' }}>
              Déclarer une pièce trouvée
              <IconeFleche taille={15} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
