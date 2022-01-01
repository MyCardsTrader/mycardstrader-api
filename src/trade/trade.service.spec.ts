import * as Mock from 'mockingoose';
import * as mongoose from "mongoose";
import { TradeService } from './trade.service';
import { getModelToken } from '@nestjs/mongoose';
import { TradeSchema } from './schema/trade.schema';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateTradeDto } from './dto/create-trade.dto';
import { HttpException, NotFoundException } from '@nestjs/common';

const tradeModel = getModelToken('Trade');

const TradeTestModel = mongoose.model('Trade', TradeSchema);

const userId = 'userId';

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

const tradeDoc = {
  _id: '507f191e810c19729de860ea',
  user: 'userId',
  trader: 'traderId',
  userCards: [],
  traderCards: ['cardId'],
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
        }
      ],
    }).compile();

    service = module.get<TradeService>(TradeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create a Trade', () => {
    const tradeDto: CreateTradeDto = {
      trader: 'tradeId',
      traderCards: ['61aff9b226d0e050c18bfcae'],
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

  describe('Get All Trades', () => {

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

  describe('Get Trade By Id', () => {    
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
      Mock(TradeTestModel).toReturn(new Error('Cannot find trades'), 'findOne');

      // When
      // Then
      await expect(service.getTradeById(tradeId))
        .rejects.toThrowError(HttpException);
    });
  });
});
