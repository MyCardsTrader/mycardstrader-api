import Mock from 'mockingoose';
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

  describe('Update a message', () => {
    it('Should update message content', async() => {
      Mock(MessageTestModel).toReturn({ ...messageDoc, content: 'Updated' }, 'findOneAndUpdate');
      const result = await service.updateMessage(messageIdMock, { content: 'Updated' });
      expect(formatMongo(result).content).toBe('Updated');
    });

    it('Should throw HttpException on update failure', async() => {
      Mock(MessageTestModel).toReturn(new Error('Cannot update'), 'findOneAndUpdate');
      await expect(service.updateMessage(messageIdMock, { content: 'Updated' }))
        .rejects.toThrow(HttpException);
    });

    it('Should throw NotFoundException when message is absent', async() => {
      Mock(MessageTestModel).toReturn(undefined, 'findOneAndUpdate');
      await expect(service.updateMessage(messageIdMock, { content: 'Updated' }))
        .rejects.toThrow(NotFoundException);
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

  describe('Mark messages read', () => {
    it('Should return the number of updated received messages', async() => {
      Mock(MessageTestModel).toReturn({ modifiedCount: 2 }, 'updateMany');
      await expect(service.markTradeMessagesRead(tradeIdMock, userIdMock))
        .resolves.toEqual({ updatedCount: 2 });
    });

    it('Should throw HttpException on update failure', async() => {
      Mock(MessageTestModel).toReturn(new Error('Cannot mark read'), 'updateMany');
      await expect(service.markTradeMessagesRead(tradeIdMock, userIdMock))
        .rejects.toThrow(HttpException);
    });
  });

  describe('Message summaries', () => {
    it('Should return no summaries when no completed trades exist', async() => {
      await expect(service.getMessageSummaries([], userIdMock)).resolves.toEqual([]);
    });

    it('Should count unread received messages and retain the last message date', async() => {
      const firstDate = new Date('2026-01-01T10:00:00Z');
      const lastDate = new Date('2026-01-01T11:00:00Z');
      Mock(MessageTestModel).toReturn([
        { ...messageDoc, _id: '507f191e810c19729de860ec', user: 'other-user', viewed: true },
        { ...messageDoc, user: 'other-user', viewed: false, createdAt: firstDate },
        { ...messageDoc, _id: '507f191e810c19729de860eb', user: userIdMock, createdAt: lastDate },
      ], 'find');

      const result = await service.getMessageSummaries([tradeIdMock], userIdMock);

      expect(result).toEqual([{ tradeId: tradeIdMock, unreadCount: 1, lastMessageAt: lastDate }]);
    });

    it('Should throw HttpException on summary lookup failure', async() => {
      Mock(MessageTestModel).toReturn(new Error('Cannot summarize'), 'find');
      await expect(service.getMessageSummaries([tradeIdMock], userIdMock))
        .rejects.toThrow(HttpException);
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
