import { Action } from "./action.enum";
import { Injectable } from "@nestjs/common";
import { Card } from "../card/schema/card.schema";
import { UserDocument } from "../user/schema/user.schema";
import { Ability, AbilityBuilder, AbilityClass, ExtractSubjectType, InferSubjects } from '@casl/ability';

type Subjects = InferSubjects<typeof Card> | 'all';

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

  createForUser(user: UserDocument): AppAbility {
    const { can, cannot, build } = CaslAbilityFactory.getAbilityBuilder();
    // Base option for CASL nestjs implements
    // istanbul ignore next
    const detectSubjectType = item => item.constructor as ExtractSubjectType<Subjects>;
    
    can(Action.Read, Card);
    can(Action.Create, Card);
    can(Action.Update, Card, { user: user._id }).because('Only for owner');
    can(Action.Delete, Card, { user: user._id });

    return build({
      detectSubjectType
    });
  }
}
