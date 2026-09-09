import {
  Body,
  Controller,
  Put,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Trade } from "./schema/trade.schema";
import { TradeService } from "./trade.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CaslService } from "../casl/casl.service";
import { CreateTradeDto, ListTradeQueryDto, UpdateTradeDto } from "./dto";
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
} from "@nestjs/swagger";
import { UpdateTradeSuccessDto } from "./dto/update-trade-success.dto";
import { UpdateTradeDeclineDto } from "./dto/update-trade-declined.dto";

@ApiTags("trade")
@Controller("trade")
export class TradeController {
  constructor(
    private readonly tradeService: TradeService,
    private readonly caslService: CaslService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create a trade" })
  @ApiBody({ type: CreateTradeDto })
  @ApiOkResponse({ description: "Trade created successfully." })
  @ApiBadRequestResponse({ description: "Trade payload is invalid." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade creation error.",
  })
  @Post()
  async createTrade(
    @Body() createTradeDto: CreateTradeDto,
    @Request() req,
  ): Promise<Trade> {
    return this.tradeService.createTrade(createTradeDto, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "List all trades visible to the authenticated user context",
  })
  @ApiOkResponse({ description: "Trades returned successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade lookup error.",
  })
  @Get()
  async getAllTrades(): Promise<Trade[]> {
    return await this.tradeService.getAllTrades();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: "tradeId",
    required: true,
  })
  @ApiOperation({ summary: "Get a trade by id" })
  @ApiOkResponse({ description: "Trade returned successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Current user cannot read this trade." })
  @ApiNotFoundResponse({ description: "Trade was not found." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade lookup error.",
  })
  @Get(":tradeId")
  async findTradeById(
    @Param("tradeId") tradeId,
    @Request() req,
  ): Promise<Trade> {
    const trade: Trade = await this.tradeService.getTradeById(tradeId);
    await this.caslService.checkReadForTradeById(trade, req.user.userId);
    return trade;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: "tradeId",
    required: true,
  })
  @ApiOperation({ summary: "Delete a trade by id" })
  @ApiOkResponse({ description: "Trade deleted successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({
    description: "Current user cannot delete this trade.",
  })
  @ApiNotFoundResponse({ description: "Trade was not found." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade deletion error.",
  })
  @Delete(":tradeId")
  async deleteTrade(@Param("tradeId") tradeId, @Request() req): Promise<Trade> {
    const trade: Trade = await this.tradeService.getTradeById(tradeId);
    await this.caslService.checkDeleteForTrade(trade, req.user.userId);
    return await this.tradeService.deleteTrade(tradeId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: "tradeId",
    required: true,
  })
  @ApiOperation({ summary: "Update a trade by id" })
  @ApiBody({ type: UpdateTradeDto })
  @ApiOkResponse({ description: "Trade updated successfully." })
  @ApiBadRequestResponse({ description: "Trade update payload is invalid." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiNotFoundResponse({ description: "Trade was not found." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade update error.",
  })
  @Put(":tradeId")
  async updateTrade(
    @Param("tradeId") tradeId,
    @Body() updateTradeDto: UpdateTradeDto,
  ): Promise<Trade> {
    // await this.caslService.checkUpdateForTrade(req.user.userId, updateTradeDto);
    return await this.tradeService.updateTrade(tradeId, updateTradeDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: "tradeId",
    required: true,
  })
  @ApiOperation({ summary: "Accept a trade as one of its participants" })
  @ApiBody({ type: UpdateTradeSuccessDto })
  @ApiOkResponse({ description: "Trade acceptance processed successfully." })
  @ApiBadRequestResponse({ description: "Acceptance payload is invalid." })
  @ApiUnauthorizedResponse({
    description: "Authentication is required or user cannot accept this trade.",
  })
  @ApiNotFoundResponse({ description: "Trade was not found." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade acceptance error.",
  })
  @Put(":tradeId/accept")
  async updateTradeSuccess(
    @Param("tradeId") tradeId,
    @Body() updateTradeSuccessDto: UpdateTradeSuccessDto,
    @Request() req,
  ): Promise<Trade> {
    const userId = req.user.userId;
    return await this.tradeService.acceptTrade(
      userId,
      tradeId,
      updateTradeSuccessDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: "tradeId",
    required: true,
  })
  @ApiOperation({ summary: "Decline a trade as one of its participants" })
  @ApiBody({ type: UpdateTradeDeclineDto })
  @ApiOkResponse({ description: "Trade decline processed successfully." })
  @ApiBadRequestResponse({ description: "Decline payload is invalid." })
  @ApiUnauthorizedResponse({
    description:
      "Authentication is required or user cannot decline this trade.",
  })
  @ApiNotFoundResponse({ description: "Trade was not found." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade decline error.",
  })
  @Put(":tradeId/decline")
  async updateTradeDecline(
    @Param("tradeId") tradeId,
    @Body() updateTradeDeclineDto: UpdateTradeDeclineDto,
    @Request() req,
  ): Promise<Trade> {
    const userId = req.user.userId;
    return await this.tradeService.declineTrade(
      userId,
      tradeId,
      updateTradeDeclineDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: "userId",
    required: true,
  })
  @ApiOperation({ summary: "List trades by user id" })
  @ApiOkResponse({ description: "Trades returned successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected trade lookup error.",
  })
  @Get("/user/:userId")
  async findTradeByUser(
    @Param("userId") userId,
    @Query() query: ListTradeQueryDto,
  ): Promise<Trade[]> {
    return await this.tradeService.findTradesByUser(userId, query);
  }
}
