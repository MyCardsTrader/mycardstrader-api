import { Action } from "./action.enum";
import { Injectable } from "@nestjs/common";
import { Card } from "../card/schema/card.schema";
import { Trade } from "../trade/schema/trade.schema";
import { Message } from "../message/schema/message.schema";
import { Ability, AbilityBuilder, AbilityClass, ExtractSubjectType, InferSubjects } from '@casl/ability';

type Subjects = InferSubjects<typeof Card | typeof Trade | typeof Message> | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  // No need to test CASL internal library
  // istanbul ignore next
  static getAbilityBuilder() {
    return new AbilityBuilder<Ability<
        [Action, Subjects]>
      >(Ability as AbilityClass<AppAbility>);
  }

  createForUser(userId: string): AppAbility {
    const { can, cannot, build } = CaslAbilityFactory.getAbilityBuilder();
    // Base option for CASL nestjs implements
    // istanbul ignore next
    const detectSubjectType = item => item.constructor as ExtractSubjectType<Subjects>;

    can([Action.Read, Action.Create], Card);
    can(Action.Update, Card, { user: userId }).because('Only for owner');
    can(Action.Delete, Card, { user: userId });
    can(Action.Read, Trade, { user: userId });
    can(Action.Read, Trade, { trader: userId });
    can(Action.Delete, Trade, { user: userId });
    can(Action.Update, Trade, ['traderCards', 'userAccept'], { user: userId });
    can(Action.Update, Trade, ['userCards', 'traderAccept'], { trader: userId });
    can(Action.Delete, Message, { user: userId });

    return build({
      detectSubjectType
    });
  }
}
