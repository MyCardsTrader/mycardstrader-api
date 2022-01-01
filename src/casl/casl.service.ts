import { Action } from './action.enum';
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
    if (!ability.can(Action.Read, tradeToTest as Trade)) {
      throw new UnauthorizedException('You cannot access this trade');
    }
    return true;
  }

}
