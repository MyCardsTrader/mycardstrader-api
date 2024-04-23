import { Model, MongooseOptions, PopulateOptions } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Card } from '../card/schema/card.schema';
import { CreateTradeDto, UpdateTradeDto } from './dto';
import { Trade, TradeDocument } from './schema/trade.schema';
import { HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateTradeSuccessDto } from './dto/update-trade-success.dto';
import { UpdateTradeDeclineDto } from './dto/update-trade-declined.dto';

@Injectable()
export class TradeService {

  constructor(
    @InjectModel(Trade.name) private readonly tradeModel: Model<TradeDocument>,
    @InjectModel(Card.name) private readonly cardModel: Model<Card>,
  ) {}
  async createTrade(
    createTradeDto: CreateTradeDto,
    userId: string,
  ): Promise<Trade> {
    try {
      const newTrade = new this.tradeModel({
        ...createTradeDto,
        user: userId,
      });
      return await newTrade.save();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async getAllTrades(): Promise<Trade[]> {
    try {
      return await this.tradeModel.find({})
        .exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async findTradesByUser(userId: string): Promise<Trade[]> {
    try {
      return await this.tradeModel.find({ $or: [{ user: userId }, { trader: userId }]});
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async getTradeById(tradeId: string): Promise<Trade> {
    let trade: Trade;
    try {
      trade = await this.tradeModel.findOne({ _id: tradeId})
        .populate({ path: 'userCards'})
        .populate({ path: 'traderCards'})
        .exec();
    } catch (error) {
      throw new HttpException('Database error', 520);
    }
    if (!trade) throw new NotFoundException();
    return trade;
  }

  async deleteTrade(tradeId: string): Promise<Trade> {
    let trade: Trade;
    try {
      trade = await this.tradeModel.findOneAndDelete({ _id: tradeId });
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!trade) throw new NotFoundException();
    return trade;
  }

  async updateTrade(tradeId: string, updateTradeDto: UpdateTradeDto): Promise<Trade> {
    let trade: Trade;
    try {
      trade = await this.tradeModel
        .findOneAndUpdate(
          { _id: tradeId },
          { $set: { ...updateTradeDto }},
          { new: true },
        )
        .populate({ path: 'userCards'})
        .populate({ path: 'traderCards'})
        .exec();;
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!trade) throw new NotFoundException();
    return trade;
  }

  async acceptTrade(userId: string, tradeId: string, updateTradeSuccessDto: UpdateTradeSuccessDto): Promise<Trade> {
    try {
      const trade = await this.tradeModel.findOne({ _id: tradeId });
      if (userId === trade.user) {
        trade.userAccept = updateTradeSuccessDto.accept;
      } else if (userId === trade.trader) {
        trade.traderAccept = updateTradeSuccessDto.accept;
      } else {
        throw new UnauthorizedException();
      }
      if (trade.userAccept && trade.traderAccept) {
        trade.tradeStatus = 'success';
        const cardsToUpdate = trade.userCards.concat(trade.traderCards);
        await this.cardModel.updateMany({ _id: { $in: cardsToUpdate }}, { $set: { availability: 'traded' }});
      }
      return this.tradeModel.findOneAndUpdate({ _id: tradeId }, trade, { new: true})
        .populate({ path: 'userCards'})
        .populate({ path: 'traderCards'})
        .exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async declineTrade(userId: string, tradeId: string, updateTradeDeclineDto: UpdateTradeDeclineDto): Promise<Trade> {
    try {
      const trade = await this.tradeModel.findOne({ _id: tradeId });
      console.log('Trade', trade);
      if (userId !== trade.user && userId !== trade.trader) {
        throw new UnauthorizedException();
      }
      if (userId == trade.user) {
        trade.userAccept = !updateTradeDeclineDto.decline;
      }
      if (userId == trade.trader) {
        trade.traderAccept = !updateTradeDeclineDto.decline;
      }
      return this.tradeModel.findOneAndUpdate({ _id: tradeId }, { $set: { tradeStatus: 'rejected' }}, { new: true})
        .populate({ path: 'userCards'})
        .populate({ path: 'traderCards'})
        .exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }
}
