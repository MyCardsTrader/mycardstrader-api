import { Action } from './action.enum';
import { CaslService } from './casl.service';
import { defineAbility } from '@casl/ability';
import { Trade } from '../trade/schema/trade.schema';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CaslAbilityFactory } from './casl-ability.factory';

const userIdMock = 'userId';
const traderIdMock = 'traderId';

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
    let tradeMock: Trade;

    beforeEach(() => {
      tradeMock = {
        user: userIdMock,
        trader: traderIdMock,
        userCards: [],
        traderCards: [],
        userAccept: false,
        traderAccept: false,
        tradeStatus: 'pending',
      };
    });

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
      tradeMock.user = 'noUserId';
      tradeMock.user = 'noUserId';
      jest.spyOn(caslAbilityFactoryMock, 'createForUser').mockReturnValueOnce({
        can: () => false
      });
      // When
      // Then
      await expect(service.checkReadForTradeById(tradeMock, userIdMock))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
