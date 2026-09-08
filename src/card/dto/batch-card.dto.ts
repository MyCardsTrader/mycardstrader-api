/* istanbul ignore file */

import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEnum,
  IsNotEmptyObject,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CardLang } from "../interfaces/lang.enum";
import { Grading } from "../interfaces/grading.enum";

export class BatchCardChangesDto {
  @ApiPropertyOptional({ enum: CardLang })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(CardLang)
  lang?: CardLang;

  @ApiPropertyOptional({ enum: Grading })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Grading)
  grading?: Grading;

  @ApiPropertyOptional({ example: "nonfoil", maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  foil_treatment?: string;
}

export class BatchCardUpdateItemDto {
  @ApiProperty({
    pattern: "^[a-f0-9]{24}$",
    example: "507f191e810c19729de860ea",
  })
  @Matches(/^[a-f0-9]{24}$/)
  cardId: string;

  @ApiProperty({
    type: BatchCardChangesDto,
    description:
      "At least one editable field; unknown fields and null are rejected.",
  })
  @IsDefined()
  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => BatchCardChangesDto)
  changes: BatchCardChangesDto;
}

export class BatchUpdateCardsDto {
  @ApiProperty({
    type: [BatchCardUpdateItemDto],
    minItems: 1,
    maxItems: 100,
    description: "Unique card IDs; each card can have different changes.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique((item) => item?.cardId)
  @ValidateNested({ each: true })
  @Type(() => BatchCardUpdateItemDto)
  items: BatchCardUpdateItemDto[];
}

export class BatchDeleteCardsDto {
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: 100,
    uniqueItems: true,
    example: ["507f191e810c19729de860ea"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @Matches(/^[a-f0-9]{24}$/, { each: true })
  cardIds: string[];
}

export class BatchUpdatedCardDto {
  @ApiProperty() _id: string;
  @ApiProperty({ enum: CardLang }) lang: CardLang;
  @ApiProperty({ enum: Grading }) grading: Grading;
  @ApiPropertyOptional({ nullable: true }) foil_treatment?: string | null;
}

export class BatchErrorDto {
  @ApiProperty({
    enum: [
      "CARD_BATCH_INVALID",
      "CARD_BATCH_NOT_FOUND",
      "CARD_BATCH_CONFLICT",
      "CARD_BATCH_FAILED",
    ],
  })
  code: string;
  @ApiProperty() message: string;
  @ApiPropertyOptional({ type: [String] }) cardIds?: string[];
}

export class BatchUpdateResponseDto {
  @ApiProperty() updatedCount: number;
  @ApiProperty({ type: [BatchUpdatedCardDto] }) cards: BatchUpdatedCardDto[];
}

export class BatchDeleteResponseDto {
  @ApiProperty() deletedCount: number;
  @ApiProperty({ type: [String] }) deletedIds: string[];
}
