import { Action } from './action.enum';
import { Card } from '../card/schema/card.schema';
import { Trade } from '../trade/schema/trade.schema';
import { CaslAbilityFactory } from './casl-ability.factory';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class CaslService {
  constructor(private readonly abilityFactory: CaslAbilityFactory) {}

  async checkReadForTradeById(trade: Trade, userId: string): Promise<boolean> {
    const ability = await this.abilityFactory.createForUser(userId);
    const tradeToTest = new Trade();
    tradeToTest.user = trade.user;
    tradeToTest.trader = trade.trader;
    if (!ability.can(Action.Read, tradeToTest)) {
      throw new UnauthorizedException('You cannot access this trade');
    }
    return true;
  }

  async checkForTrade(trade: Trade, userId: string, action: Action): Promise<boolean> {
    const ability = await this.abilityFactory.createForUser(userId);
    if(!ability.can(action, trade)) {
      throw new UnauthorizedException('You cannot access this trade');
    }
    return true;
  }

  async checkForCard(card: Card, userId: string, action: Action): Promise<boolean> {
    const ability = await this.abilityFactory.createForUser(userId);
    const cardForTest = new Card();
    cardForTest.user = card.user;
    if (!ability.can(action, cardForTest)) {
      throw new UnauthorizedException('You cannot delete this card');
    }
    return true;
  }
}
