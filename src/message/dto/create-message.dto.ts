/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @IsMongoId()
  trade: string;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  content: string;
}