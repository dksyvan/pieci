import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { FindOrCreateUtilisateurDto } from './dto/find-or-create-utilisateur.dto';

@Injectable()
export class UtilisateursService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurs: Repository<Utilisateur>,
  ) {}

  /**
   * Retrouve l'utilisateur associé à ce numéro de téléphone, ou le crée.
   * Pas de flux d'inscription visible : appelé en interne lors d'une
   * déclaration de perte/trouvaille.
   */
  async findOrCreate(dto: FindOrCreateUtilisateurDto): Promise<Utilisateur> {
    const existant = await this.utilisateurs.findOne({ where: { telephone: dto.telephone } });
    if (existant) return existant;

    const utilisateur = this.utilisateurs.create({
      telephone: dto.telephone,
      prenom: dto.prenom,
      nom: dto.nom,
      email: dto.email ?? null,
    });
    return this.utilisateurs.save(utilisateur);
  }

  /**
   * Recherche par téléphone sans création — utilisé pour identifier
   * l'auteur d'une action (confirmation/rejet/révélation de contact) sur
   * une correspondance existante.
   */
  findByTelephone(telephone: string): Promise<Utilisateur | null> {
    return this.utilisateurs.findOne({ where: { telephone } });
  }
}
