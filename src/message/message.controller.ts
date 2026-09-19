import {
  Get,
  Body,
  Post,
  Param,
  Patch,
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
import { CreateMessageDto, MessageSummaryDto, UpdateMessageDto } from './dto';
import { TradeStatus } from '../trade/dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('message')
@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly tradeService: TradeService,
    private readonly caslService: CaslService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a message in a trade conversation' })
  @ApiBody({ type: CreateMessageDto })
  @ApiOkResponse({ description: 'Message created successfully.' })
  @ApiBadRequestResponse({ description: 'Message payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot post on this trade.' })
  @ApiNotFoundResponse({ description: 'Trade was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected message creation error.' })
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
  @ApiParam({ name: 'messageId', required: true })
  @ApiOperation({ summary: 'Update a message by id' })
  @ApiBody({ type: UpdateMessageDto })
  @ApiOkResponse({ description: 'Message updated successfully.' })
  @ApiBadRequestResponse({ description: 'Message payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot update this message.' })
  @ApiNotFoundResponse({ description: 'Message was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected message update error.' })
  @Patch(':messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req,
  ): Promise<Message> {
    const message = await this.messageService.getMessageById(messageId);
    await this.caslService.checkUpdateForMessage(message, req.user.userId);
    return await this.messageService.updateMessage(messageId, updateMessageDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'messageId',
    required: true,
  })
  @ApiOperation({ summary: 'Delete a message by id' })
  @ApiOkResponse({ description: 'Message deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot delete this message.' })
  @ApiNotFoundResponse({ description: 'Message was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected message deletion error.' })
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
  @ApiOperation({ summary: 'Get unread counts and last message dates for completed trades' })
  @ApiOkResponse({ type: [MessageSummaryDto], description: 'Message summaries returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected message summary error.' })
  @Get('trades/summary')
  async getMessageSummaries(@Request() req): Promise<MessageSummaryDto[]> {
    const trades = await this.tradeService.findTradesByUser(req.user.userId, {
      status: TradeStatus.SUCCESS,
    });
    return await this.messageService.getMessageSummaries(
      trades.map((trade: any) => String(trade._id)),
      req.user.userId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'tradeId', required: true })
  @ApiOperation({ summary: 'Mark received messages for a trade as read' })
  @ApiOkResponse({ description: 'Messages marked as read.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Messaging is unavailable for this trade.' })
  @ApiNotFoundResponse({ description: 'Trade was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected message update error.' })
  @Patch('trade/:tradeId/read')
  async markTradeMessagesRead(
    @Param('tradeId') tradeId: string,
    @Request() req,
  ): Promise<{ updatedCount: number }> {
    const trade = await this.tradeService.getTradeById(tradeId);
    await this.caslService.checkReadForMessageByTrade(trade, req.user.userId);
    return await this.messageService.markTradeMessagesRead(tradeId, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'tradeId',
    required: true,
  })
  @ApiOperation({ summary: 'List messages for a trade' })
  @ApiOkResponse({ description: 'Messages returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot read messages for this trade.' })
  @ApiNotFoundResponse({ description: 'Trade was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected message lookup error.' })
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
