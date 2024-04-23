/* istanbul ignore file */
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTradeDeclineDto {
  @ApiProperty()
  decline: boolean;
}

