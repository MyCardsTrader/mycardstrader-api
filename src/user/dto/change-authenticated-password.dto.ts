/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangeAuthenticatedPasswordDto {
  @ApiProperty({ format: "password", minLength: 1 })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ format: "password", minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
