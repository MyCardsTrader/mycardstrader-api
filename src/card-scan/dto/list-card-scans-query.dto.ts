import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { CardScanStatus } from "../card-scan.types";
export class ListCardScansQueryDto {
  @ApiPropertyOptional({ enum: CardScanStatus })
  @IsOptional()
  @IsEnum(CardScanStatus)
  status?: CardScanStatus;
}
