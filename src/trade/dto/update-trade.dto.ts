/* istanbul ignore file */
import { IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTradeDto {
  @ApiProperty({
    type: [String],
    description: 'User cards',
    example: ['87b22b09-4f6d-4bc5-9cfc-663e4c7c2019'],
  })
  @IsOptional()
  userCards?: string[];

  @ApiProperty({
    type: [String],
    description: 'Trader cards',
    example: ['87b22b09-4f6d-4bc5-9cfc-663e4c7c2023'],
  })
  @IsOptional()
  traderCards?: string[];

  @ApiProperty({
    type: Boolean,
    description: 'User accept the trade',
    example: true,
  })
  @IsOptional()
  userAccept?: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Trader accept the trade',
    example: true,
  })
  @IsOptional()
  traderAccept?: boolean;
}

