/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'Trade ID',
    example: '87b22b09-4f6d-4bc5-9cfc-663e4c7c1989',
  })
  @IsNotEmpty()
  @IsMongoId()
  trade: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Message content',
    example: 'Hello, I am interested in your card',
  })
  @IsNotEmpty()
  content: string;
}