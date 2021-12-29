/* istanbul ignore file */

import { Action } from '../action.enum';
import { Card } from '../../card/schema/card.schema';
import { AppAbility } from '../casl-ability.factory';
import { IPolicyHandler } from '../interfaces/policy-handler.interface'

export class CreateCardPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Create, Card);
  }
}