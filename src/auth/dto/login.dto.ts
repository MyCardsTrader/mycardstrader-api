import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'Email of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Password of the new user',
  })
  @IsString()
  password: string;
}
