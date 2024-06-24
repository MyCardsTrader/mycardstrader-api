/* istanbul ignore file */
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTradeSuccessDto {
  @ApiProperty({
    type: Boolean,
    description: 'Accept the trade',
    example: true,
  })
  accept: boolean;
}

