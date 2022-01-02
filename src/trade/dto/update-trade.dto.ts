/* istanbul ignore file */
import { IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTradeDto {
  @ApiProperty()
  @IsOptional()
  userCards?: string[];

  @ApiProperty()
  @IsOptional()
  traderCards?: string[];

  @ApiProperty()
  @IsOptional()
  userAccept?: boolean;

  @ApiProperty()
  @IsOptional()
  traderAccept?: boolean;
}

