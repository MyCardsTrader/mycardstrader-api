import { 
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { Card } from './schema/card.schema';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/create-card.dto';
import { DeleteCardDto } from './dto/delete-card.dto';

@Controller('card')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @ApiParam({
    name: 'userId',
    required: true,
  })
  @Get('/user/:userId')
  async findByUser(@Param('userId') userId): Promise<Card[] | HttpException> {
    return await this.cardService.findCardByUser(userId);
  }

  @Post()
  async createCard(
    @Body() cardDto: CreateCardDto
  ): Promise<Card | HttpException> {
    return await this.cardService.createCard(cardDto);
  }

  @Delete()
  async deleteCard(
    @Body() deleteCardDto: DeleteCardDto
  ): Promise<Card | HttpException> {
    return await this.cardService.deleteCard(deleteCardDto.id);
  }
}
