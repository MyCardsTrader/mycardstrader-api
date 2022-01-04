import * as Mock from 'mockingoose';
import * as mongoose from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MessageService } from './message.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageSchema } from './schema/message.schema';
import { HttpException, NotFoundException } from '@nestjs/common';

const messageModel = getModelToken('Message');

const MessageTestModel = mongoose.model('Message', MessageSchema);

const userIdMock = 'userIdMock';

const tradeIdMock = 'tradeIdMock';

const messageIdMock = '507f191e810c19729de860ea';

const messageDoc = {
  _id: messageIdMock,
  user: 'userIdMock',
  content: 'contentMock',
  trade: tradeIdMock,
  viewed: false,
};

const messageDeleteDoc = {
  id: messageIdMock,
}

const formatMongo = (doc) => {
  return JSON.parse(JSON.stringify(doc));
}

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: messageModel,
          useValue: MessageTestModel,
        }
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create a message', () => {
    
    const messageDto = {
      content: 'contentMock',
      trade: 'tradeIdMock',
    }

    beforeEach(() => {
      Mock.resetAll();
    });

    it('Should create a message', async() => {
      // Given
      Mock(MessageTestModel).toReturn(messageDoc, 'save');

      // When
      const result = await service.createMessage(messageDto, userIdMock);

      // Then
      expect(formatMongo(result)).toEqual(messageDoc);
    });

    it('Should throw HttpException', async() => {
      // Given
      Mock(MessageTestModel).toReturn(new Error('Cannot save'), 'save');
      // When
      // Then
      await expect(service.createMessage(messageDto, userIdMock))
        .rejects.toThrow(HttpException);
    });
  });

  describe('Delete a message', () => {
    it('Should findOneAndDelete message', async() => {
      // Given
      Mock(MessageTestModel).toReturn(messageDoc, 'findOneAndDelete');

      // When
      const result = await service.deleteMessage(messageIdMock);

      // Then
      expect(formatMongo(result)).toEqual(messageDoc);
    });

    it('Should throw HttpException on findOneAndDelete message', async() => {
      // Given
      Mock(MessageTestModel)
        .toReturn(new Error('Cannot findOneAndDelete'), 'findOneAndDelete');

      // When
      // Then
      await expect(service.deleteMessage(messageDeleteDoc.id))
        .rejects.toThrow(HttpException);
    });

    it('Should throw NotFoundException on findOneAndDelete message', async() => {
      // Given
      Mock(MessageTestModel).toReturn(undefined, 'findOneAndDelete');

      // When
      // Then
      await expect(service.deleteMessage(messageDeleteDoc.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Get a message by id', () => {
    it('Should get message by id', async() => {
      // Given
      Mock(MessageTestModel).toReturn(messageDoc, 'findOne');

      // When
      const result = await service.getMessageById(messageIdMock);

      // Then
      expect(formatMongo(result)).toEqual(messageDoc);
    });

    it('Should throw HttpException on find message by id', async() => {
      // Given
      Mock(MessageTestModel)
        .toReturn(new Error('Cannot find message'), 'findOne');

      // When
      // Then
      await expect(service.getMessageById(messageIdMock))
        .rejects.toThrow(HttpException);
    });

    it('Should throw NotFoundException on find message by id', async() => {
      // Given
      Mock(MessageTestModel).toReturn(undefined, 'findOne');

      // When
      // Then
      await expect(service.getMessageById(messageIdMock))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('GetMessageByTrade', () => {
    it('Should get message by trade', async() => {
      // Given
      Mock(MessageTestModel).toReturn([messageDoc], 'find');

      // When
      const result = await service.getMessagesByTrade(tradeIdMock);

      // Then
      expect(formatMongo(result)).toEqual([messageDoc]);
    });

    it('Should throw HttpException on find message by id', async() => {
      // Given
      Mock(MessageTestModel)
        .toReturn(new Error('Cannot find message'), 'find');

      // When
      // Then
      await expect(service.getMessagesByTrade(tradeIdMock))
        .rejects.toThrow(HttpException);
    });
  });
});
