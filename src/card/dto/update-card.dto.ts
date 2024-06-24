/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { CardLang } from '../interfaces/lang.enum';
import { Grading } from '../interfaces/grading.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateCardDto {
  @ApiProperty({
    enum: CardLang,
    description: 'Lang of the card',
    example: CardLang.EN,
  })
  @IsEnum(CardLang)
  @IsOptional()
  lang?: CardLang;

  @ApiProperty({
    type: Grading,
    enum: Grading,
    description: 'Grading of the card',
    example: Grading.NM,
  })
  @IsEnum(Grading)
  @IsOptional()
  grading?: Grading;

  @ApiProperty({
    type: String,
    description: 'Foil treatments of the card',
    example: 'foil',
  })
  foil_treatments?: string;
}