/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';
import { CountryEnum } from '../schema/user.schema';
import { UserLocation } from '../schema/user.schema';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    required: true,
    type: String,
    description: 'Email of the user',
    example: 'nemo@yopmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    required: true,
    type: String,
    description: 'Password of the new user',
    example: 'nautilus1869-1870',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    required: true,
    type: 'object',
    description: 'Location of the user',
    example: {
      type: 'Point',
      coordinates: [0, 0],
    },
  })
  @IsNotEmpty()
  location: UserLocation;

  @ApiProperty({
    required: true,
    enum: CountryEnum,
    description: 'Country of the user',
    example: CountryEnum.FR,
  })
  @IsNotEmpty()
  country: CountryEnum;
}
