import * as Mock from 'mockingoose';
import * as mongoose from 'mongoose';
import { CardService } from './card.service';
import { HttpException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { CardSchema } from './schema/card.schema';
import { CardLang } from './interfaces/lang.enum';
import { Grading } from './interfaces/grading.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCardDto } from './dto/create-card.dto';

const cardModel = getModelToken('Card');

const CardTestModel = mongoose.model('Card', CardSchema);

const userId = 'userId';

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

const cardDoc = {
  _id: '507f191e810c19729de860ea',
  oracle_id: '8d02b297-97c4-4379-9862-0a462400f66f',
  cardmarket_id: 3574,
  name:'Phyrexian Altar',
  lang: CardLang.EN,
  image_uri: {
    small: 'https://c1.scryfall.com/file/scryfall-cards/small/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    normal: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    large: 'https://c1.scryfall.com/file/scryfall-cards/large/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    png: 'https://c1.scryfall.com/file/scryfall-cards/png/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.png?1562902485',
    art_crop: 'https://c1.scryfall.com/file/scryfall-cards/art_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
    border_crop: 'https://c1.scryfall.com/file/scryfall-cards/border_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
  },
  user: "61aff9b226d0e050c18bfcae",
}

const cardDeleteDoc = {
  id: '507f191e810c19729de860ea',
}

describe('CardService', () => {
  let service: CardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: cardModel,
          useValue: CardTestModel,
        }
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('Create a card', () => {
    
    const cardDto: CreateCardDto = {
      oracle_id: '8d02b297-97c4-4379-9862-0a462400f66f',
      cardmarket_id: 3574,
      name:'Phyrexian Altar',
      lang: CardLang.EN,
      grading: Grading.M,
      image_uri: {
        small: 'https://c1.scryfall.com/file/scryfall-cards/small/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        normal: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        large: 'https://c1.scryfall.com/file/scryfall-cards/large/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        png: 'https://c1.scryfall.com/file/scryfall-cards/png/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.png?1562902485',
        art_crop: 'https://c1.scryfall.com/file/scryfall-cards/art_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
        border_crop: 'https://c1.scryfall.com/file/scryfall-cards/border_crop/front/2/5/25158cd5-749b-408c-9ab1-0f83e38730f7.jpg?1562902485',
      }
    }
    
    beforeEach(() => {
      Mock.resetAll();
    })

    it('should create a card', async() => {
      // Given
      Mock(CardTestModel).toReturn(cardDoc, 'save');
  
      // When
      const result = await service.createCard(cardDto, userId);

      // Then
      expect(formatMongo(result)).toEqual(cardDoc);
    });

    it('should throw an HttpException', async() => {
      // Given
      Mock(CardTestModel).toReturn(new Error('Cannot save'), 'save');
      // When
      //Then
      await expect(service.createCard(cardDto, userId)).rejects.toThrow(HttpException);
    });
  });

  describe('Delete a card', () => {
    it('should findOneAndDelete card', async() => {
      // Given
      Mock(CardTestModel).toReturn(cardDoc, 'findOneAndDelete');

      // When
      const result = await service.deleteCard('cardId');

      // Then
      expect(formatMongo(result)).toEqual(cardDoc);
    });

    it('should throw HttpException on findOneAndDelete card', async() => {
      // Given
      Mock(CardTestModel).toReturn(new Error('Cannot findOneAndDelete'), 'findOneAndDelete');

      // When
      // Then
      await expect(service.deleteCard(cardDeleteDoc.id)).rejects.toThrow(HttpException);
    });
  });

  describe('Find cards by user', () => {
    it('should find cards by user', async()=> {
      // Given
      const returnValue = [cardDoc];
      Mock(CardTestModel).toReturn(returnValue, 'find');

      // When
      const result  = await service.findCardByUser('userId');

      // Then
      expect(formatMongo(result)).toEqual(returnValue);
    });
    it('should throw HttpException on find cards', async() => {
      // Given
      Mock(CardTestModel).toReturn(new Error('Cannot find cards'), 'find');

      // When
      // Given
      await expect(service.findCardByUser('userId')).rejects.toThrow(HttpException);
    });
  });
});
