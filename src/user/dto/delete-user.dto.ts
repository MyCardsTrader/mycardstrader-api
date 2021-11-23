import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteUserDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}
