import { describe, expect, it } from 'vitest';
import { resoudreMode, type EtatNavigateur } from './installation';

/**
 * Le bouton « Installer l'app » ne doit s'afficher que lorsqu'il fait
 * quelque chose. Un bouton sans effet, en pleine démonstration, est pire que
 * pas de bouton : c'est ce que ces cas figent.
 */

const aucun: EtatNavigateur = { installee: false, integre: false, ios: false, inviteDisponible: false };

describe('resoudreMode', () => {
  it('propose l’invite quand Chrome l’a fournie', () => {
    expect(resoudreMode({ ...aucun, inviteDisponible: true })).toBe('invite');
  });

  it('explique le geste sur iPhone, où aucun navigateur n’a d’invite', () => {
    expect(resoudreMode({ ...aucun, ios: true })).toBe('ios');
  });

  it('se tait quand l’application tourne déjà depuis l’écran d’accueil', () => {
    // Même si le navigateur garde une invite sous le coude.
    expect(resoudreMode({ ...aucun, installee: true, inviteDisponible: true })).toBe('installee');
    expect(resoudreMode({ ...aucun, installee: true, ios: true })).toBe('installee');
  });

  it('se tait sur les navigateurs sans invite — Firefox, Safari sur ordinateur', () => {
    expect(resoudreMode(aucun)).toBe('indisponible');
  });

  it('préfère l’invite aux instructions quand les deux sont possibles', () => {
    // Un iPad qui fournirait l'événement : un clic vaut mieux que trois étapes.
    expect(resoudreMode({ ...aucun, ios: true, inviteDisponible: true })).toBe('invite');
  });

  /**
   * Un lien touche dans Facebook ou Instagram s'ouvre dans leur navigateur
   * interne. Sur iPhone son user-agent contient « iPhone » : sans ce cas, on y
   * affichait les etapes Safari, impossibles a suivre la-dedans.
   */
  it('se tait dans le navigateur intégré d’une application, même sur iPhone', () => {
    expect(resoudreMode({ ...aucun, integre: true, ios: true })).toBe('indisponible');
    expect(resoudreMode({ ...aucun, integre: true, inviteDisponible: true })).toBe('indisponible');
  });
});
