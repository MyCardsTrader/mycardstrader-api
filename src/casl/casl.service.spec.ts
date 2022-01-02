import { Action } from './action.enum';
import { CaslService } from './casl.service';
import { Trade } from '../trade/schema/trade.schema';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CardLang } from '../card/interfaces/lang.enum';
import { Grading } from '../card/interfaces/grading.enum';
import { CaslAbilityFactory } from './casl-ability.factory';

const userIdMock = 'userId';
const traderIdMock = 'traderId';

const tradeMock: Trade = {
  user: userIdMock,
  trader: traderIdMock,
  userCards: [],
  traderCards: [],
  userAccept: false,
  traderAccept: false,
  tradeStatus: 'pending',
};

const caslAbilityFactoryMock = {
  createForUser: (userId: string) => {
    return {
      can: () => true,
    };
  },
};

describe('CaslService', () => {
  let service: CaslService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaslService,
        CaslAbilityFactory,
      ],
    })
    .overrideProvider(CaslAbilityFactory)
    .useValue(caslAbilityFactoryMock)
    .compile();

    service = module.get<CaslService>(CaslService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkReadForTradeById', () => {

    it('Should return true if userId is equal', async () => {
      // Given
      // When
      const result = await service.checkReadForTradeById(tradeMock, userIdMock);
      // Then
      expect(result).toBe(true);
    });

    it('Should return true if traderId is equal', async () => {
      // Given
      // When
      const result = await service.checkReadForTradeById(tradeMock, traderIdMock);
      // Then
      expect(result).toBe(true);
    });

    it('Should throw a UnauthorizedException', async () => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false
      });
      // When
      // Then
      await expect(service.checkReadForTradeById(tradeMock, userIdMock))
        .rejects.toThrow(UnauthorizedException);
    });

  });

  describe('CheckUpdateForTrade', () => {
    const updateTradeDtoMock = {
      userCards: ['cardId'],
      userAccept: true,
    };

    it('Should return true if user is owner', async() => {
      // Given
      // When
      const result = await service.checkUpdateForTrade(tradeMock, userIdMock, updateTradeDtoMock);
      // Then
      expect(result).toBe(true);
    });

    it('Should throw a UnauthorizedException', async() => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false,
      });
      // When
      // Then
      await expect(service.checkUpdateForTrade(tradeMock, userIdMock, updateTradeDtoMock))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('CheckDeleteForTrade', () => {

    it('Should return true if user is owner', async() => {
      // Given
      // When
      const result = await service.checkDeleteForTrade(tradeMock, userIdMock);
      // Then
      expect(result).toBe(true);
    });

    it('Should throw a UnauthorizedException', async() => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false,
      });
      // When
      // Then
      await expect(service.checkDeleteForTrade(tradeMock, userIdMock))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('CheckForCard', () => {
    let cardMock;

    beforeEach(() => {
      cardMock = {
        _id: 'cardId',
        user: 'userId',
        grading: Grading.EX,
        lang: CardLang.FR,
        oracle_id: 'oracle_id',
        cardmarket_id: 1111,
        name: 'Black lotus',
        image_uri: {},
      };
    });

    it('Should return true if user own the card', async() => {
      // Given
      // When
      const result = await service.checkForCard(cardMock, 'userId', Action.Delete);
      // Then
      expect(result).toBe(true);
    });

    it('Should throw and UnauthorizedException', async() => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false
      });
      // When
      // Then
      await expect(service.checkForCard(cardMock, 'userId', Action.Update))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
