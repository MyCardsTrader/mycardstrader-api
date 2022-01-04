import { MessageService } from './message.service';
import { CaslService } from '../casl/casl.service';
import { Trade } from '../trade/schema/trade.schema';
import { Test, TestingModule } from '@nestjs/testing';
import { TradeService } from '../trade/trade.service';
import { MessageController } from './message.controller';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './schema/message.schema';

const messageServiceMock = {
  createMessage: jest.fn(),
  deleteMessage: jest.fn(),
  getMessageById: jest.fn(),
  getMessagesByTrade: jest.fn(),
}

const tradeServiceMock = {
  getTradeById: jest.fn(),
}

const caslServiceMock = {
  checkCreateForMessage: jest.fn(),
  checkDeleteForMessage: jest.fn(),
  checkReadForMessageByTrade: jest.fn(),
}

const userIdMock = 'userId';

const tradeMock: Trade = {
  user: userIdMock,
  trader: 'traderId',
  traderCards: [],
  userCards: [],
  userAccept: false,
  traderAccept: false,
  tradeStatus: 'pending',
};

const reqMock = {
  user: {
    userId: userIdMock,
  }
};

describe('MessageController', () => {
  let controller: MessageController;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [MessageService, TradeService, CaslService],
    })
      .overrideProvider(MessageService)
      .useValue(messageServiceMock)
      .overrideProvider(TradeService)
      .useValue(tradeServiceMock)
      .overrideProvider(CaslService)
      .useValue(caslServiceMock)
      .compile();

    controller = module.get<MessageController>(MessageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('Should call message service createMessage()', async() => {
    // Given
    const createMessageDto: CreateMessageDto = {
      trade: 'tradeId',
      content: 'contentMock',
    };
    jest.spyOn(tradeServiceMock, 'getTradeById').mockReturnValueOnce(tradeMock);
    // When
    await controller.createMessage(createMessageDto, reqMock);
    
    // Then
    expect(tradeServiceMock.getTradeById).toHaveBeenCalledTimes(1);
    expect(tradeServiceMock.getTradeById)
      .toHaveBeenCalledWith(createMessageDto.trade);
    expect(caslServiceMock.checkCreateForMessage).toHaveBeenCalledTimes(1);
    expect(caslServiceMock.checkCreateForMessage)
      .toHaveBeenCalledWith(tradeMock, userIdMock);
    expect(messageServiceMock.createMessage).toHaveBeenCalledTimes(1);
    expect(messageServiceMock.createMessage)
      .toHaveBeenCalledWith(createMessageDto, userIdMock);
  });

  it('Should call message service deleteMessage()', async() => {
    // Given
    const messageIdMock = 'messageIdMock';
    const messageMock: Message = {
      user: userIdMock,
      content: 'contentMock',
      trade: 'tradeIdMock',
      viewed: false,
    }
    jest.spyOn(messageServiceMock, 'getMessageById')
      .mockReturnValueOnce(messageMock);
    // When
    await controller.deleteMessage(messageIdMock, reqMock);

    // Then
    expect(messageServiceMock.getMessageById).toHaveBeenCalledTimes(1);
    expect(messageServiceMock.getMessageById)
      .toHaveBeenCalledWith(messageIdMock);
    expect(caslServiceMock.checkDeleteForMessage).toHaveBeenCalledTimes(1);
    expect(caslServiceMock.checkDeleteForMessage)
      .toHaveBeenCalledWith(messageMock, userIdMock);
    expect(messageServiceMock.deleteMessage).toHaveBeenCalledTimes(1);
    expect(messageServiceMock.deleteMessage)
      .toHaveBeenCalledWith(messageIdMock);
  });


  it('Should call message service getMessagesByTrade()', async() => {
    // Given
    const tradeIdMock = 'tradeId';
    jest.spyOn(tradeServiceMock, 'getTradeById')
      .mockReturnValueOnce(tradeMock);
    // When
    await controller.getMessagesByTrade(tradeIdMock, reqMock);

    // Then
    expect(tradeServiceMock.getTradeById).toHaveBeenCalledTimes(1);
    expect(tradeServiceMock.getTradeById)
      .toHaveBeenCalledWith(tradeIdMock);
    expect(caslServiceMock.checkReadForMessageByTrade).toHaveBeenCalledTimes(1);
    expect(caslServiceMock.checkReadForMessageByTrade)
      .toHaveBeenCalledWith(tradeMock, userIdMock);
    expect(messageServiceMock.getMessagesByTrade).toHaveBeenCalledTimes(1);
    expect(messageServiceMock.getMessagesByTrade)
      .toHaveBeenCalledWith(tradeIdMock);
  });

});
