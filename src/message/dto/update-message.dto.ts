/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateMessageDto {
  @ApiProperty({
    type: String,
    description: "Updated message content",
    example: "Can we meet tomorrow?",
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
