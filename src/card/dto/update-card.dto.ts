/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { CardLang } from '../interfaces/lang.enum';
import { Grading } from '../interfaces/grading.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateCardDto {
  @ApiProperty()
  @IsEnum(CardLang)
  @IsOptional()
  lang?: CardLang;

  @ApiProperty({
    type: Grading,
    enum: Grading,
  })
  @IsEnum(Grading)
  @IsOptional()
  grading?: Grading;

  @ApiProperty()
  foil_treatments?: string;
}