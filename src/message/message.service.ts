import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message, MessageDocument } from './schema/message.schema';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>
  ) {}

  async createMessage(
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    try {
      const newMessage = new this.messageModel({
        ...createMessageDto,
        user: userId,
      });
      return await newMessage.save();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async deleteMessage(messageId: string): Promise<Message> {
    let messageDeleted: Message;
    try {
      messageDeleted = await this.messageModel.findOneAndDelete({ _id: messageId });
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!messageDeleted) throw new NotFoundException();
    return messageDeleted;
  }

  async getMessageById(messageId: string): Promise<Message> {
    let message: Message;
    try {
      message = await this.messageModel.findOne({ _id: messageId });
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!message) throw new NotFoundException();
    return message;
  }

  async getMessagesByTrade(tradeId: string): Promise<Message[]> {
    try {
      return await this.messageModel.find({ trade: tradeId })
        .populate({ path: 'user', select: '-password -salt'})
        .exec()
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }
}
