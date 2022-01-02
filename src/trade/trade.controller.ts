import { 
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards 
} from '@nestjs/common';
import { Action } from '../casl/action.enum';
import { Trade } from './schema/trade.schema';
import { TradeService } from './trade.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CaslService } from '../casl/casl.service';
import { CreateTradeDto, UpdateTradeDto } from './dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@Controller('trade')
export class TradeController {
  constructor(
    private readonly tradeService: TradeService,
    private readonly caslService: CaslService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async createTrade(
    @Body() createTradeDto: CreateTradeDto,
    @Request() req,
  ): Promise<Trade> {
    return this.tradeService.createTrade(createTradeDto, req.user.userId) 
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllTrades(): Promise<Trade[]> {
    return await this.tradeService.getAllTrades();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'tradeId',
    required: true,
  })
  @Get(':tradeId')
  async findTradeById(
    @Param('tradeId') tradeId,
    @Request() req,
  ): Promise<Trade> {
    const trade: Trade = await this.tradeService.getTradeById(tradeId);
    await this.caslService.checkReadForTradeById(trade, req.user.userId);
    return trade;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'tradeId',
    required: true,
  })
  @Delete(':tradeId')
  async deleteTrade(
    @Param('tradeId') tradeId,
    @Request() req,
  ): Promise<Trade> {
    const trade: Trade = await this.tradeService.getTradeById(tradeId);
    await this.caslService.checkDeleteForTrade(trade, req.user.userId);
    return await this.tradeService.deleteTrade(tradeId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'tradeId',
    required: true,
  })
  @Delete(':tradeId')
  async updateTrade(
    @Param('tradeId') tradeId,
    @Body() updateTradeDto: UpdateTradeDto,
    @Request() req,
  ): Promise<Trade> {
    const trade: Trade = await this.tradeService.getTradeById(tradeId);
    await this.caslService.checkUpdateForTrade(trade, req.user.userId, updateTradeDto);
    return await this.tradeService.updateTrade(tradeId, updateTradeDto);
  }
}
