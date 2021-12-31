import {
  Get,
  Body,
  Post,
  Param,
  Delete,
  UseGuards,
  Controller,
  HttpException,
  Request,
} from '@nestjs/common';
import { Card } from './schema/card.schema';
import { CardService } from './card.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateCardDto } from './dto/create-card.dto';
import { DeleteCardDto } from './dto/delete-card.dto';
import { PoliciesGuard } from '../casl/policies.guard';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CheckPolicies } from '../casl/check-policy.decorator';
import { ReadCardPolicyHandler, CreateCardPolicyHandler } from '../casl/policies';

@Controller('card')
export class CardController {
  constructor(
    private readonly cardService: CardService,
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

  @Delete()
  async deleteCard(
    @Body() deleteCardDto: DeleteCardDto
  ): Promise<Card> {
    return await this.cardService.deleteCard(deleteCardDto.id);
  }
}
