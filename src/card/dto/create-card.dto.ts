/* istanbul ignore file */

import { IsNotEmpty, Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CardLang } from '../interfaces/lang.enum';
import { Grading } from '../interfaces/grading.enum';
import { ImageUris } from '../interfaces/image-uris.interface';

export class CreateCardDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'Oracle ID of the card',
    example: '87b22b09-4f6d-4bc5-9cfc-663e4c7c6981',
  })
  @IsNotEmpty()
  oracle_id: string;

  @ApiProperty({
    required: true,
    type: Number,
    description: 'Cardmarket ID of the card',
    example: 721740,
  })
  @Allow(null)
  cardmarket_id: number;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Name of the card',
    example: 'The Ur-Dragon',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    required: true,
    enum: CardLang,
    description: 'Language of the card',
    example: CardLang.EN,
  })
  @IsNotEmpty()
  lang: CardLang;

  @ApiProperty({
    required: true,
    enum: Grading,
    description: 'Grading of the card',
    example: Grading.EX,
  })
  @IsNotEmpty()
  grading: Grading;

  @ApiProperty({
    required: true,
    type: Object,
    description: 'Image URIs of the card',
    example: {
      'small': 'https://cards.scryfall.io/small/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317',
      'normal': 'https://cards.scryfall.io/normal/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317',
      'large': 'https://cards.scryfall.io/large/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317',
      'png': 'https://cards.scryfall.io/png/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.png?1689999317',
      'art_crop': 'https://cards.scryfall.io/art_crop/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317',
      'border_crop': 'https://cards.scryfall.io/border_crop/front/1/0/10d42b35-844f-4a64-9981-c6118d45e826.jpg?1689999317'
    },
  })
  @IsNotEmpty()
  image_uris: ImageUris;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Coverted mana cost of the card',
  })
  @IsNotEmpty()
  cmc: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Type line of the card',
    example: 'Legendary Creature — Dragon Avatar',
  })
  @IsNotEmpty()
  type_line: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Set of the card',
    example: 'cmm',
  })
  @IsNotEmpty()
  set: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Set SVG of the card',
    example: 'https://c1.scryfall.com/file/scryfall-set-symbol/svg/cmm.svg',
  })
  @IsNotEmpty()
  set_svg: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Collector number of the card',
    example: "361"
  })
  @IsNotEmpty()
  collector_number: string;

  @ApiProperty({
    required: false,
    type: String,
    description: 'colors of the card',
    example: ['W', 'U', 'B', 'R', 'G']
  })
  colors: string[];

  @ApiProperty({
    required: false,
    type: String,
    description: 'color identity of the card',
    example: ['W', 'U', 'B', 'R', 'G']
  })
  color_identity: string[];

  @ApiProperty({
    required: false,
    type: String,
    description: 'Foil treatment of the card',
    example: 'nonfoil',
  })
  foil_treatment?: string;
}
