/* istanbul ignore file */
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTradeSuccessDto {
  @ApiProperty()
  accept: boolean;
}

