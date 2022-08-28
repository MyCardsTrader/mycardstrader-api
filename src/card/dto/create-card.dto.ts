/* istanbul ignore file */

import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CardLang } from '../interfaces/lang.enum';
import { Grading } from '../interfaces/grading.enum';
import { ImageUris } from '../interfaces/image-uris.interface';

export class CreateCardDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  oracle_id: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  cardmarket_id: number;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  lang: CardLang;

  @ApiProperty({
    required: true,
    enum: Grading,
  })
  @IsNotEmpty()
  grading: Grading;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  image_uri: ImageUris;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  cmc: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  type_line: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  set: string;

  @ApiProperty({
    required: false,
  })
  colors: string[];

  @ApiProperty({
    required: false,
  })
  color_identity: string[];
}