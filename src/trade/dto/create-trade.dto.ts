/* istanbul ignore file */
import { IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTradeDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  trader: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  traderCards: string[];
}

