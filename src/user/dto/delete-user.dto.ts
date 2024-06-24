/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteUserDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'ID of the user',
    example: '87b22b09-4f6d-4bc5-9cfc-663e4c7c6981',
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}
