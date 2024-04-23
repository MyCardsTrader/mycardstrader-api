import { Action } from './action.enum';
import { CaslService } from './casl.service';
import { Trade } from '../trade/schema/trade.schema';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CardLang } from '../card/interfaces/lang.enum';
import { Grading } from '../card/interfaces/grading.enum';
import { CaslAbilityFactory } from './casl-ability.factory';
import { Message } from 'src/message/schema/message.schema';
import { Card } from 'src/card/schema/card.schema';

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
        can: () => false,
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
      const result = await service.checkUpdateForTrade(userIdMock, updateTradeDtoMock);
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
      await expect(service.checkUpdateForTrade(userIdMock, updateTradeDtoMock))
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
    const cardMock = {
      _id: 'cardId',
      user: 'userId',
      grading: Grading.EX,
      lang: CardLang.FR,
      oracle_id: 'oracle_id',
      cardmarket_id: 1111,
      name: 'Black lotus',
      image_uri: {
        small: '',
        large: '',
        normal: '',
        png: '',
        art_crop: '',
        border_crop: '',
      },
      cmc: '3.0',
      type_line: 'Artifact',
      set: '2x2',
      set_svg: 'https://svgs.scryfall.io/sets/2x2.svg?1713758400',
      collector_number: 1,
      colors: [],
      color_identity: [],
      availability: 'available',
    } as Card;

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
        can: () => false,
      });
      // When
      // Then
      await expect(service.checkForCard(cardMock, 'userId', Action.Put))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('CheckCreateForMessage', () => {
    it ('Should return true if user can read the associated trade', async() => {
      // Given
      // When
      const result = await service.checkCreateForMessage(tradeMock, userIdMock);

      // Then
      expect(result).toBe(true);
    });

    it('Should throw an UnauthorizedException', async() => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false,
      });

      // When
      // Then
      await expect(service.checkCreateForMessage(tradeMock, userIdMock))
        .rejects.toThrow(UnauthorizedException);
    })
  });

  describe('checkReadForMessageByTrade', () => {
    it ('Should return true if user can read the associated trade', async() => {
      // Given
      // When
      const result = await service.checkReadForMessageByTrade(tradeMock, userIdMock);

      // Then
      expect(result).toBe(true);
    });

    it('Should throw an UnauthorizedException', async() => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false,
      });

      // When
      // Then
      await expect(service.checkReadForMessageByTrade(tradeMock, userIdMock))
        .rejects.toThrow(UnauthorizedException);
    })
  });

  describe('CheckDeleteForMessage', () => {
    const messageMock: Message = {
      user: userIdMock,
      trade: 'tradeId',
      content: 'Nice message',
      viewed: false,
    }

    it('Should return true if user is the message owner', async() => {
      // Given
      // When
      const result = await service.checkDeleteForMessage(messageMock, userIdMock);

      // Then
      expect(result).toBe(true);
    });

    it('Should throw an UnauthorizedException', async() => {
      // Given
      jest.spyOn(caslAbilityFactoryMock, 'createForUser')
        .mockReturnValueOnce({
          can: () => false,
        });
      
      // When
      // Then
      await expect(service.checkDeleteForMessage(messageMock, userIdMock))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
