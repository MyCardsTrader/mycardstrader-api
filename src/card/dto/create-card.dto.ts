/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ImageUris } from '../interfaces/image-uris.interface';
import { CardLang } from '../interfaces/lang.enum';
import { Grading } from '../interfaces/grading.enum';

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
}