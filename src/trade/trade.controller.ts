import { 
  Body,
  Controller,
  Put,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards 
} from '@nestjs/common';
import { Trade } from './schema/trade.schema';
import { TradeService } from './trade.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CaslService } from '../casl/casl.service';
import { CreateTradeDto, UpdateTradeDto } from './dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { UpdateTradeSuccessDto } from './dto/update-trade-success.dto';
import { UpdateTradeDeclineDto } from './dto/update-trade-declined.dto';

@ApiTags('trade')
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
  @Put(':tradeId')
  async updateTrade(
    @Param('tradeId') tradeId,
    @Body() updateTradeDto: UpdateTradeDto,
  ): Promise<Trade> {
    // await this.caslService.checkUpdateForTrade(req.user.userId, updateTradeDto);
    return await this.tradeService.updateTrade(tradeId, updateTradeDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'tradeId',
    required: true,
  })
  @Put(':tradeId/accept')
  async updateTradeSuccess(
    @Param('tradeId') tradeId,
    @Body() updateTradeSuccessDto: UpdateTradeSuccessDto,
    @Request() req,
  ): Promise<Trade> {
    const userId = req.user.userId;
    return await this.tradeService.acceptTrade(userId, tradeId, updateTradeSuccessDto);
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'tradeId',
    required: true,
  })
  @Put(':tradeId/decline')
  async updateTradeDecline(
    @Param('tradeId') tradeId,
    @Body() updateTradeDeclineDto: UpdateTradeDeclineDto,
    @Request() req,
  ): Promise<Trade> {
    const userId = req.user.userId;
    console.log('User Id', userId);
    return await this.tradeService.declineTrade(userId, tradeId, updateTradeDeclineDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'userId',
    required: true,
  })
  @Get('/user/:userId')
  async findTradeByUser(@Param('userId') userId): Promise<Trade[]> {
    return await this.tradeService.findTradesByUser(userId);
  }
}
