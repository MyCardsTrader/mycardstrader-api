import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, Matches } from "class-validator";

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export class ListCardQueryDto {
  @ApiPropertyOptional({
    description: "Maximum number of cards to return.",
    minimum: 1,
    maximum: 100,
    example: 6,
  })
  @IsOptional()
  @Matches(/^(?:[1-9]|[1-9]\d|100)$/)
  limit?: string;

  @ApiPropertyOptional({ enum: SortOrder, description: "Creation date order." })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
