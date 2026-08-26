import { EstTelephone } from '../../common/telephone';

export class FindAlertesPerteQueryDto {
  @EstTelephone()
  telephone: string;
}
