/* istanbul ignore file */
import { IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTradeDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'Trader ID',
    example: '87b22b09-4f6d-4bc5-9cfc-663e4c7c6981',
  })
  @IsNotEmpty()
  trader: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Trader cards ids',
    example: ['87b22b09-4f6d-4bc5-9cfc-663e4c7c1988'],
  })
  @IsNotEmpty()
  traderCards: string[];
}

