import {
  Get,
  Put,
  Body,
  Post,
  Param,
  Delete,
  Request,
  UseGuards,
  Controller,
} from '@nestjs/common';
import { Card } from './schema/card.schema';
import { Action } from '../casl/action.enum';
import { CardService } from './card.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CaslService } from '../casl/casl.service';
import { CreateCardDto, UpdateCardDto } from './dto';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policy.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ReadCardPolicyHandler, CreateCardPolicyHandler } from '../casl/policies';
import { User } from 'src/user/schema/user.schema';
import { BulkImportDto } from './dto/bulk-import.dto';

@ApiTags('card')
@Controller('card')
export class CardController {
  constructor(
    private readonly cardService: CardService,
    private readonly caslService: CaslService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new ReadCardPolicyHandler())
  @ApiParam({
    name: 'userId',
    required: true,
  })
  @ApiOperation({ summary: 'List cards owned by a user' })
  @ApiOkResponse({ description: 'Cards returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot read these cards.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected card lookup error.' })
  @Get('/user/:userId')
  async findByUser(@Param('userId') userId): Promise<Card[]> {
    return await this.cardService.findCardByUser(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new ReadCardPolicyHandler())
  @ApiParam({
    name: 'cardId',
    required: true,
  })
  @ApiOperation({ summary: 'Get a card by id' })
  @ApiOkResponse({ description: 'Card returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot read this card.' })
  @ApiNotFoundResponse({ description: 'Card was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected card lookup error.' })
  @Get('/:cardId')
  async findCard(@Param('cardId') cardId): Promise<Card> {
    return await this.cardService.findCardById(cardId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new CreateCardPolicyHandler)
  @ApiOperation({ summary: 'Create a card for the authenticated user' })
  @ApiBody({ type: CreateCardDto })
  @ApiCreatedResponse({ description: 'Card created successfully.' })
  @ApiBadRequestResponse({ description: 'Card payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot create cards.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected card creation error.' })
  @Post()
  async createCard(
    @Body() createCardDto: CreateCardDto,
    @Request() req,
  ): Promise<Card> {
    return await this.cardService.createCard(createCardDto, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bulk import cards for the authenticated user' })
  @ApiBody({ type: BulkImportDto })
  @ApiOkResponse({ description: 'Cards imported successfully.' })
  @ApiBadRequestResponse({ description: 'Bulk import payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected import error.' })
  @Post('/import')
  async importCards(
    @Body() bulkImportDto: BulkImportDto,
    @Request() req,
  ): Promise<any> {
    return await this.cardService.importCards(bulkImportDto, req.user.userId);
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'cardId',
    required: true,
  })
  @ApiOperation({ summary: 'Delete a card by id' })
  @ApiOkResponse({ description: 'Card deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot delete this card.' })
  @ApiNotFoundResponse({ description: 'Card was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected delete error.' })
  @Delete(':cardId')
  async deleteCard(
    @Param('cardId') cardId: string,
    @Request() req,
  ): Promise<Card> {
    const card = await this.cardService.findCardById(cardId);
    await this.caslService.checkForCard(card, req.user.userId, Action.Delete);
    return await this.cardService.deleteCard(cardId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'cardId',
    required: true,
  })
  @ApiOperation({ summary: 'Update a card by id' })
  @ApiBody({ type: UpdateCardDto })
  @ApiOkResponse({ description: 'Card updated successfully.' })
  @ApiBadRequestResponse({ description: 'Update payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({ description: 'Current user cannot update this card.' })
  @ApiNotFoundResponse({ description: 'Card was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected update error.' })
  @Put(':cardId')
  async updateCard(
    @Param('cardId') cardId: string,
    @Body() UpdateCardDto: UpdateCardDto,
    @Request() req,
  ): Promise<Card> {
    const card = await this.cardService.findCardById(cardId);
    await this.caslService.checkForCard(card, req.user.userId, Action.Put);
    return await this.cardService.updateCard(cardId, UpdateCardDto);
  }
}
