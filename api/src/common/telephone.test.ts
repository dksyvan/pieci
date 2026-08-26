import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { MESSAGE_TELEPHONE, normaliserTelephone } from './telephone';
import { TelephoneDto } from './dto/telephone.dto';

/**
 * Le téléphone est la clé du compte : deux écritures du même numéro doivent
 * arriver en base sous la même forme, sans quoi celui qui déclare avec des
 * espaces ne retrouve rien en cherchant sans.
 */

describe('normaliserTelephone', () => {
  it('ramène toutes les écritures courantes à dix chiffres', () => {
    for (const saisie of [
      '0700000000',
      '07 00 00 00 00',
      '07-00-00-00-00',
      '+225 07 00 00 00 00',
      '+2250700000000',
      '225 0700000000',
      ' 07 00 00 00 00 ',
    ]) {
      expect(normaliserTelephone(saisie), saisie).toBe('0700000000');
    }
  });

  it("ne retire l'indicatif que s'il reste un numéro complet", () => {
    // Dix chiffres commençant par 225 : c'est un numéro local, pas un
    // indicatif. Le tronquer donnerait sept chiffres et un compte fantôme.
    expect(normaliserTelephone('2250000000')).toBe('2250000000');
  });
});

describe('TelephoneDto', () => {
  const valider = (telephone: string) => {
    const dto = plainToInstance(TelephoneDto, { telephone });
    return { dto, erreurs: validateSync(dto) };
  };

  it('accepte et normalise une saisie espacée', () => {
    const { dto, erreurs } = valider('07 00 00 00 00');
    expect(erreurs).toHaveLength(0);
    expect(dto.telephone).toBe('0700000000');
  });

  it('accepte le format international', () => {
    const { dto, erreurs } = valider('+225 07 00 00 00 00');
    expect(erreurs).toHaveLength(0);
    expect(dto.telephone).toBe('0700000000');
  });

  it('refuse un numéro trop court, en français', () => {
    const { erreurs } = valider('0556');
    expect(erreurs).toHaveLength(1);
    // C'est ce texte que voyait l'utilisateur en anglais auparavant.
    expect(Object.values(erreurs[0].constraints ?? {})).toContain(MESSAGE_TELEPHONE);
  });

  it('refuse un numéro trop long', () => {
    const { erreurs } = valider('07000000001');
    expect(erreurs).toHaveLength(1);
  });

  it('refuse une saisie sans chiffres', () => {
    const { erreurs } = valider('mon numéro');
    expect(erreurs).toHaveLength(1);
  });
});
