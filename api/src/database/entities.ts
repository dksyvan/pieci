import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { PointDepot } from '../points-depot/entities/point-depot.entity';
import { PieceTrouvee } from '../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../alertes-perte/entities/alerte-perte.entity';
import { Correspondance } from '../correspondances/entities/correspondance.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { JournalAccesContact } from '../journal-acces-contact/entities/journal-acces-contact.entity';
import { PushSubscription } from '../push/entities/push-subscription.entity';
import { ExpoPushToken } from '../push/entities/expo-push-token.entity';

export const ENTITIES = [
  Utilisateur,
  PointDepot,
  PieceTrouvee,
  AlertePerte,
  Correspondance,
  Notification,
  JournalAccesContact,
  PushSubscription,
  ExpoPushToken,
];
