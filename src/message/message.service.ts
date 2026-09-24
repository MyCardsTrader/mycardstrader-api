import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { CreateMessageDto, MessageSummaryDto, UpdateMessageDto } from "./dto";
import { Message, MessageDocument } from "./schema/message.schema";
import { HttpException, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
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

  async updateMessage(
    messageId: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    let messageUpdated: Message;
    try {
      messageUpdated = await this.messageModel.findOneAndUpdate(
        { _id: messageId },
        { $set: { content: updateMessageDto.content } },
        { returnDocument: "after" },
      );
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
    if (!messageUpdated) throw new NotFoundException();
    return messageUpdated;
  }

  async deleteMessage(messageId: string): Promise<Message> {
    let messageDeleted: Message;
    try {
      messageDeleted = await this.messageModel.findOneAndDelete({
        _id: messageId,
      });
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
      return await this.messageModel
        .find({ trade: tradeId })
        .sort({ createdAt: 1 })
        .populate({ path: "user", select: "-password -salt" })
        .exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async markTradeMessagesRead(
    tradeId: string,
    userId: string,
  ): Promise<{ updatedCount: number }> {
    try {
      const result = await this.messageModel.updateMany(
        { trade: tradeId, user: { $ne: userId }, viewed: false },
        { $set: { viewed: true } },
      );
      return { updatedCount: result.modifiedCount };
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async getMessageSummaries(
    tradeIds: string[],
    userId: string,
  ): Promise<MessageSummaryDto[]> {
    if (tradeIds.length === 0) return [];
    try {
      const messages = await this.messageModel
        .find({ trade: { $in: tradeIds } })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
      const summaries = new Map<string, MessageSummaryDto>();
      for (const message of messages) {
        const tradeId = String(message.trade);
        const summary = summaries.get(tradeId) ?? {
          tradeId,
          unreadCount: 0,
          lastMessageAt: null,
        };
        summary.lastMessageAt =
          (message as any).createdAt ?? summary.lastMessageAt;
        if (String(message.user) !== userId && !message.viewed)
          summary.unreadCount += 1;
        summaries.set(tradeId, summary);
      }
      return Array.from(summaries.values());
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }
}
