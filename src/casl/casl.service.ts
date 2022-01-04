import { Action } from './action.enum';
import { UpdateTradeDto } from '../trade/dto';
import { Card } from '../card/schema/card.schema';
import { Trade } from '../trade/schema/trade.schema';
import { Message } from '../message/schema/message.schema';
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

  async checkUpdateForTrade(
    trade: Trade,
    userId: string,
    updateTradeDto: UpdateTradeDto,
  ): Promise<boolean> {
    const ability = await this.abilityFactory.createForUser(userId);
    const tradeToTest = new Trade();
    Object.keys(updateTradeDto).map((key) => {
      tradeToTest[key] = updateTradeDto[key];
    });
    const abilitiesCheck = Object.keys(updateTradeDto).map((key) => key).every((key) => {
      return ability.can(Action.Update, tradeToTest, key);
    });
    if (!abilitiesCheck) {
      throw new UnauthorizedException('You cannot access this trade');
    }
    return abilitiesCheck;
  }

  // To split into checkDeleteForTrade and checkUpdateForTrade functions
  async checkDeleteForTrade(
    trade: Trade,
    userId: string,
  ): Promise<boolean> {
    const ability = await this.abilityFactory.createForUser(userId);
    if(!ability.can(Action.Delete, trade)) {
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

  async checkCreateForMessage(trade: Trade, userId: string): Promise<boolean> {
    await this.checkReadForTradeById(trade, userId);
    return true;
  }
  
  async checkReadForMessageByTrade(trade:Trade, userId: string): Promise<boolean> {
    await this.checkReadForTradeById(trade, userId);
    return true;
  }
  
  async checkDeleteForMessage(message: Message, userId: string): Promise<boolean> {
    const ability = await this.abilityFactory.createForUser(userId);
    if (!ability.can(Action.Delete, message)) {
      throw new UnauthorizedException('You cannot delete this message');
    }
    return true;
  }

}
