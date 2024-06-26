import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCardDto } from './dto/create-card.dto';
import { Card, CardDocument } from './schema/card.schema';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { BulkImportDto } from './dto/bulk-import.dto';

@Injectable()
export class CardService {
  constructor(
    @InjectModel(Card.name) private readonly cardModel: Model<CardDocument>,
  ) { }

  async createCard(
    createCardDto: CreateCardDto,
    userId: string,
  ): Promise< Card> {
    try {
      const newCard = new this.cardModel({
        ...createCardDto,
        user: userId,
      });
      return await newCard.save();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async importCards(bulkImportDto: BulkImportDto, userId: string): Promise<Card[]> {
    const cards = bulkImportDto.cards.map((card) => {
      return {
       ...card,
        user: userId,
      };
    });
    try {
      return await this.cardModel.insertMany(cards);
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async deleteCard(cardId: string): Promise <Card> {
    let cardDeleted: Card;
    try {
      cardDeleted = await this.cardModel.findOneAndDelete({ _id: cardId });
    } catch (error) {
      throw new NotFoundException(error.message);
    }
    if (!cardDeleted) throw new NotFoundException();
    return cardDeleted;
  }

  async findCardByUser( userId: string): Promise<Card[]> {
    try {
      return await this.cardModel.find({ user: userId, availability: 'available' }).exec();
    } catch (error) {
      throw new HttpException(error.message, 520)
    }
  }

  async findCardById(cardId: string): Promise<Card> {
    let card: Card;
    try {
      card = await this.cardModel.findOne({ _id: cardId });
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!card) throw new NotFoundException();
    return card;
  }

  async updateCard(cardId: string, updateCardDto): Promise<Card> {
    try {
      return await this.cardModel
        .findOneAndUpdate(
          { _id: cardId },
          { $set: { ...updateCardDto }},
          { new: true },
        );
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }
}
