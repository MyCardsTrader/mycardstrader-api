import {
  Get,
  Body,
  Post,
  Param,
  Delete,
  Request,
  UseGuards,
  Controller,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Message } from './schema/message.schema';
import { MessageService } from './message.service';
import { CaslService } from '../casl/casl.service';
import { TradeService } from '../trade/trade.service';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly tradeService: TradeService,
    private readonly caslService: CaslService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Request() req,
  ): Promise<Message> {
    const trade = await this.tradeService.getTradeById(createMessageDto.trade);
    await this.caslService.checkCreateForMessage(trade, req.user.userId);
    return await this.messageService.createMessage(createMessageDto, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'messageId',
    required: true,
  })
  @Delete(':messageId')
  async deleteMessage (
    @Param('messageId') messageId: string,
    @Request() req,
  ): Promise<Message> {
    const message = await this.messageService.getMessageById(messageId);
    this.caslService.checkDeleteForMessage(message, req.user.userId);
    return await this.messageService.deleteMessage(messageId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'messageId',
    required: true,
  })
  @Get(':tradeId')
  async getMessagesByTrade (
    @Param('tradeId') tradeId: string,
    @Request() req,
  ): Promise<Message[]> {
    const trade = await this.tradeService.getTradeById(tradeId);
    this.caslService.checkReadForMessageByTrade(trade, req.user.userId);
    return await this.messageService.getMessagesByTrade(tradeId);
  }
}
