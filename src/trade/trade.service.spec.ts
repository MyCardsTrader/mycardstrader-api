import * as Mock from 'mockingoose';
import * as mongoose from "mongoose";
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, NotFoundException } from '@nestjs/common';

import { TradeService } from './trade.service';
import { TradeSchema } from './schema/trade.schema';
import { UpdateTradeDto, CreateTradeDto } from './dto';
import { CardLang } from '../card/interfaces/lang.enum';
import { CardSchema } from '../card/schema/card.schema';
import { Grading } from '../card/interfaces/grading.enum';

const tradeModel = getModelToken('Trade');

const TradeTestModel = mongoose.model('Trade', TradeSchema);

const cardModel = getModelToken('Card');

const CardTestModel = mongoose.model('Card', CardSchema);

const userId = 'userId';

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

const cardId = '507f191e810c19729de860ea';

const cardDoc = {
  _id: cardId,
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
  },
  cmc: '3.0',
  type_line: 'Artifact',
  set: '2x2',
  set_svg: "https://svgs.scryfall.io/sets/mh2.svg?1713153600",
  collector_number: 1,
  colors: [],
  color_identity: [],
  user: '61aff9b226d0e050c18bfcae',
}

const tradeDoc = {
  _id: '507f191e810c19729de860ea',
  user: 'userId',
  trader: 'traderId',
  userCards: [],
  traderCards: [cardId],
  userAccept: false,
  traderAccept: false,
  tradeStatus: 'pending',
};

describe('TradeService', () => {
  let service: TradeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeService,
        {
          provide: tradeModel,
          useValue: TradeTestModel,
        },
        {
          provide: cardModel,
          useValue: CardTestModel,
        }
      ],
    }).compile();

    service = module.get<TradeService>(TradeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTrade', () => {
    const tradeDto: CreateTradeDto = {
      trader: 'tradeId',
      traderCards: [cardId],
    }

    beforeEach(() => {
      Mock.resetAll();
    });

    it('Should create a trade', async () => {
      // Given
      Mock(TradeTestModel).toReturn(tradeDoc, 'save');

      // When
      const result = await service.createTrade(tradeDto, userId);

      // Then
      expect(formatMongo(result)).toEqual(tradeDoc);
    });

    it('Should throw an HttpException', async () => {
      // Given
      Mock(TradeTestModel).toReturn(new Error('Cannot save'), 'save');

      // When
      // Then
      await expect(service.createTrade(tradeDto, userId))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getAllTrades', () => {

    beforeEach(() => {
      Mock.resetAll();
    });

    it('Should get all trades', async() => {
      // Given
      Mock(TradeTestModel).toReturn([tradeDoc], 'find');

      // When
      const result = await service.getAllTrades();

      // Then
      expect(formatMongo(result)).toEqual([tradeDoc]);
    });

    it('Should throw HttpException', async () => {
      // Given
      Mock(TradeTestModel).toReturn(new Error('Cannot find trades'), 'find');

      // When
      // Then
      await expect(service.getAllTrades())
        .rejects.toThrowError(HttpException);
    });
  });

  describe('getTradesByUser', () => {

    beforeEach(() => {
      Mock.resetAll();
    });

    it('Should get all trades', async() => {
      // Given
      Mock(TradeTestModel).toReturn([tradeDoc], 'find');

      // When
      const result = await service.findTradesByUser('userId');

      // Then
      expect(formatMongo(result)).toEqual([tradeDoc]);
    });

    it('Should throw HttpException', async () => {
      // Given
      Mock(TradeTestModel).toReturn(new Error('Cannot find trades'), 'find');

      // When
      // Then
      await expect(service.findTradesByUser('userId'))
        .rejects.toThrowError(HttpException);
    });
  });

  describe('getTradeById', () => {    
    const tradeId = '507f191e810c19729de860ea';

    beforeEach(() => {
      Mock.resetAll();
    });

    it('Should get a specific trade', async() => {
      // Given
      Mock(TradeTestModel).toReturn(tradeDoc, 'findOne');
      
      // When
      const result = await service.getTradeById(tradeId);

      // Then
      expect(formatMongo(result)).toEqual(tradeDoc);
    });

    it('Should throw NotFoundException', async() => {
      // Given
      Mock(TradeTestModel).toReturn(null, 'findOne');
      
      // When
      // Then
      await expect(service.getTradeById('fakeId'))
        .rejects.toThrow(NotFoundException);
    });

    it('Should throw HttpException', async () => {
      // Given
      Mock(TradeTestModel)
        .toReturn(new Error('Cannot find trades'), 'findOne');

      // When
      // Then
      await expect(service.getTradeById(tradeId))
        .rejects.toThrowError(HttpException);
    });
  });

  describe('DeleteTrade', () => {
    const tradeIdMock = '507f191e810c19729de860ea';

    beforeEach(() => {
      Mock.resetAll();
    });

    it('Should delete a specific trade', async() => {
      // Given
      Mock(TradeTestModel).toReturn(tradeDoc, 'findOneAndDelete');

      // When
      const result = await service.deleteTrade(tradeIdMock);

      // Then
      expect(formatMongo(result)).toEqual(tradeDoc);
    });

    it('Should throw an HttpException', async() => {
      // Given
      Mock(TradeTestModel)
        .toReturn(new Error(), 'findOneAndDelete');

      // When
      // Then
      await expect(service.deleteTrade(tradeIdMock))
        .rejects.toThrow(HttpException);
    });

    it('Should throw an NotFoundException', async() => {
      // Given
      Mock(TradeTestModel)
        .toReturn(undefined, 'findOneAndDelete');

      // When
      // Then
      await expect(service.deleteTrade(tradeIdMock))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('UpdateTrade', () => {
    const tradeIdMock = '507f191e810c19729de860ea';
    const updateTradeDtoMock: UpdateTradeDto = {
      userCards: [cardId],
      traderAccept: true,
    };

    it('Should update a specific trade', async() => {
      // Given
      const tradeDocUpdated = {
        ...tradeDoc,
        userCards: [cardId],
        traderAccept: true,
      };
      Mock(TradeTestModel).toReturn(tradeDocUpdated, 'findOneAndUpdate');
      
      // When
      const result = await service.updateTrade(tradeIdMock, updateTradeDtoMock);
      
      // Then
      expect(formatMongo(result)).toEqual(tradeDocUpdated);
    });

    it('Should throw an HttpException', async() => {
      // Given
      Mock(TradeTestModel)
        .toReturn(new Error(), 'findOneAndUpdate');

      // When
      // Then
      await expect(service.updateTrade(tradeIdMock, updateTradeDtoMock))
        .rejects.toThrow(HttpException);
    });

    it('Should throw NotFoundException', async() => {
      // Given
      Mock(TradeTestModel)
        .toReturn(undefined, 'findOneAndUpdate');
      
      // When
      // Then
      await expect(service.updateTrade(tradeIdMock, updateTradeDtoMock))
        .rejects.toThrow(NotFoundException);
    });
  });
});
