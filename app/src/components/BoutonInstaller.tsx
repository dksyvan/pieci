import { useEffect, useRef, useState } from 'react';
import { useInstallation } from '../lib/installation';
import { IconeInstaller, IconePartage } from './Icones';

/**
 * « Installer l'app », dans l'en-tête.
 *
 * Deux gestes selon l'appareil, et aucun bouton quand il n'y a rien à faire :
 * - Android (Chrome, Edge) : le bouton ouvre l'invite du système, un clic.
 * - iPhone et iPad : aucun navigateur n'expose d'invite. Le bouton déplie les
 *   étapes du partage Safari — c'est ce geste qu'on montre en démonstration.
 *
 * Il n'apparaît qu'après le montage (voir useInstallation) : le HTML
 * pré-rendu ne sait rien du navigateur qui le lira.
 */
export function BoutonInstaller() {
  const { mode, installer } = useInstallation();
  const [aideOuverte, setAideOuverte] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  /**
   * Fermer en rendant le focus au bouton. Sans cela, le bouton « Fermer »
   * disparaît avec le panneau et le focus retombe sur le document : au
   * clavier comme avec VoiceOver, on se retrouve renvoyé en haut de la page.
   */
  const fermer = () => {
    setAideOuverte(false);
    bouton.current?.focus();
  };

  // Le panneau se referme au clic ailleurs et sur Échap : il recouvre le haut
  // de la page, et ne doit pas rester planté devant le contenu. Au clic
  // ailleurs, on ne reprend pas le focus — la personne l'a mis là exprès.
  useEffect(() => {
    if (!aideOuverte) return;
    const dehors = (e: PointerEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setAideOuverte(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAideOuverte(false);
      if (zone.current?.contains(document.activeElement)) bouton.current?.focus();
    };
    document.addEventListener('pointerdown', dehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', dehors);
      document.removeEventListener('keydown', echap);
    };
  }, [aideOuverte]);

  if (mode !== 'invite' && mode !== 'ios') return null;

  return (
    <div className="installer" ref={zone}>
      <button
        ref={bouton}
        type="button"
        className="btn-installer"
        aria-expanded={mode === 'ios' ? aideOuverte : undefined}
        aria-controls={mode === 'ios' ? 'installer-aide' : undefined}
        onClick={() => (mode === 'invite' ? void installer() : setAideOuverte((o) => !o))}
      >
        <IconeInstaller taille={15} />
        Installer l’app
      </button>

      {/*
        Les étapes ne disent ni « en bas » ni « iPhone » : le bouton Partager
        est en bas sur iPhone, en haut à droite sur iPad, et rangé dans le
        menu ⋯ sous iOS 26 quand Safari est en disposition compacte. Une
        consigne qui nomme une position se trompe sur au moins un de ces
        appareils — et c'est en pleine démonstration qu'on s'en aperçoit.
      */}
      {mode === 'ios' && aideOuverte && (
        <div
          className="installer-aide"
          id="installer-aide"
          role="region"
          aria-label="Installer Pièci sur l’écran d’accueil"
        >
          <b>Depuis Safari :</b>
          <ol>
            <li>
              {/* Espaces explicites : JSX supprime le saut de ligne entre deux
                  éléments, et un lecteur d'écran lisait « Partageren ». */}
              Touche <b>Partager</b>{' '}
              <span className="installer-icone" aria-hidden="true">
                <IconePartage taille={14} />
              </span>{' '}
              — dans la barre de Safari, ou dans le menu ⋯
            </li>
            <li>
              Choisis <b>Sur l’écran d’accueil</b>, en faisant défiler la liste si besoin
            </li>
            <li>
              Valide avec <b>Ajouter</b>
            </li>
          </ol>
          <p className="aide">Pièci s’ouvre ensuite comme une application, sans barre d’adresse.</p>
          <button type="button" className="lien" onClick={fermer}>
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
