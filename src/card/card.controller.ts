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
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ReadCardPolicyHandler, CreateCardPolicyHandler } from '../casl/policies';

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
  @Get('/user/:userId')
  async findByUser(@Param('userId') userId): Promise<Card[]> {
    return await this.cardService.findCardByUser(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies(new CreateCardPolicyHandler)
  @Post()
  async createCard(
    @Body() createCardDto: CreateCardDto,
    @Request() req,
  ): Promise<Card> {
    return await this.cardService.createCard(createCardDto, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'cardId',
    required: true,
  })
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
