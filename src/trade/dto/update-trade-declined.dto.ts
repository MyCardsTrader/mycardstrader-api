/* istanbul ignore file */
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTradeDeclineDto {
  @ApiProperty({
    type: Boolean,
    description: 'Decline the trade',
    example: true,
  })
  decline: boolean;
}

