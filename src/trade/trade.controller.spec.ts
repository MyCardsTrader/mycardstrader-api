import { Trade } from './schema/trade.schema';
import { TradeService } from './trade.service';
import { CaslService } from '../casl/casl.service';
import { TradeController } from './trade.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateTradeDto } from './dto/create-trade.dto';

const userIdMock = 'userId';

const reqMock = { user: { userId: userIdMock } };

const caslServiceMock = {
  checkReadForTradeById: jest.fn(),
}

const tradeServiceProviderMock = {
  createTrade: jest.fn(),
  getAllTrades: jest.fn(),
  getTradeById: jest.fn(),
}

describe('TradeController', () => {
  let controller: TradeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradeController],
      providers: [
        TradeService,
        CaslService,
      ]
    })
    .overrideProvider(TradeService)
    .useValue(tradeServiceProviderMock)
    .overrideProvider(CaslService)
    .useValue(caslServiceMock)
    .compile();

    controller = module.get<TradeController>(TradeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should call createTrade()', async () => {
    // Given
    const createTradeDto: CreateTradeDto = {
      trader: 'traderId',
      traderCards: ['cardId'],
    }
    // When
    await controller.createTrade(createTradeDto, reqMock);
    // Then
    expect(tradeServiceProviderMock.createTrade)
      .toHaveBeenCalledTimes(1);
    expect(tradeServiceProviderMock.createTrade)
      .toHaveBeenCalledWith(createTradeDto, userIdMock);
  });

  it('Should call getAllTrades()', async () => {
    // Given
    // When
    await controller.getAllTrades();
    // Then
    expect(tradeServiceProviderMock.getAllTrades).toHaveBeenCalledTimes(1);
  })

  it('Should call findTradeById() and checkForTradeById()', async () => {
    // Given
    const tradeIdMock = Symbol('tradeId');
    const tradeMock = new Trade();

    tradeServiceProviderMock.getTradeById.mockReturnValueOnce(tradeMock);
    // When
    await controller.findTradeById(tradeIdMock, reqMock);
    // Then
    expect(tradeServiceProviderMock.getTradeById)
      .toHaveBeenCalledTimes(1);
    expect(tradeServiceProviderMock.getTradeById)
      .toHaveBeenCalledWith(tradeIdMock);
    expect(caslServiceMock.checkReadForTradeById)
      .toHaveBeenCalledTimes(1);
    expect(caslServiceMock.checkReadForTradeById)
      .toHaveBeenCalledWith(tradeMock, userIdMock);
  })
});
