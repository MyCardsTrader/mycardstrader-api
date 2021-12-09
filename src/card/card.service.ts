import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCardDto } from './dto/create-card.dto';
import { Card, CardDocument } from './schema/card.schema';
import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class CardService {
  constructor(
    @InjectModel(Card.name) private readonly cardModel: Model<CardDocument>,
  ) { }

  async createCard(
    createCardDto: CreateCardDto
  ): Promise< Card | HttpException> {
    try {
      const newCard = new this.cardModel(createCardDto);
      return await newCard.save();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async deleteCard(cardId: string): Promise <Card | HttpException> {
    try {
      return await this.cardModel.findOneAndDelete({ _id: cardId });
    } catch (error) {
      throw new HttpException(error.message, 404);
    }
  }

  async findCardByUser( userId: string): Promise<Card[] | HttpException> {
    try {
      return await this.cardModel.find({ user: userId }).exec();
    } catch (error) {
      throw new HttpException(error.message, 520)
    }
  }
}
