import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, Matches } from "class-validator";

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export enum TradeStatus {
  PENDING = "pending",
  SUCCESS = "success",
  REJECTED = "rejected",
}

export class ListTradeQueryDto {
  @ApiPropertyOptional({
    description: "Maximum number of trades to return.",
    minimum: 1,
    maximum: 100,
    example: 4,
  })
  @IsOptional()
  @Matches(/^(?:[1-9]|[1-9]\d|100)$/)
  limit?: string;

  @ApiPropertyOptional({ enum: SortOrder, description: "Creation date order." })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;

  @ApiPropertyOptional({ enum: TradeStatus })
  @IsOptional()
  @IsEnum(TradeStatus)
  status?: TradeStatus;
}
