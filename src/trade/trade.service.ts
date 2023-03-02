import { Model, MongooseOptions, PopulateOptions } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Card } from '../card/schema/card.schema';
import { User } from '../user/schema/user.schema';
import { CreateTradeDto, UpdateTradeDto } from './dto';
import { Trade, TradeDocument } from './schema/trade.schema';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TradeService {

  constructor(
    @InjectModel(Trade.name) private readonly tradeModel: Model<TradeDocument>,
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

  getPopulateOptionsForUser = (path: string): PopulateOptions => {
    return {
      path: path,
      select: '-salt -password -holdTreasures -availableTreasures',
      model: 'User',
    }
  }

  async getAllTrades(): Promise<Trade[]> {
    try {
      return await this.tradeModel.find({})
        .populate(this.getPopulateOptionsForUser('user'))
        .populate(this.getPopulateOptionsForUser('trader'))
        .populate('traderCards', Card)
        .populate('userCards', Card)
        .exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async getTradeById(tradeId: string): Promise<Trade> {
    let trade: Trade;
    try {
      trade = await this.tradeModel.findOne({ _id: tradeId})
        .populate(this.getPopulateOptionsForUser('user'))
        .populate(this.getPopulateOptionsForUser('trader'))
        .populate('traderCards', Card)
        .populate('userCards', Card)
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
        );
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!trade) throw new NotFoundException();
    return trade;
  }
}
