/* istanbul ignore file */

import { IsNotEmpty, Allow } from 'class-validator';
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
  @Allow(null)
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
    required: true,
  })
  @IsNotEmpty()
  set_svg: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  collector_number: number;

  @ApiProperty({
    required: false,
  })
  colors: string[];

  @ApiProperty({
    required: false,
  })
  color_identity: string[];

  @ApiProperty({
    required: false,
  })
  foil_treatment: string;
}

function AllowNull() {
  throw new Error('Function not implemented.');
}
