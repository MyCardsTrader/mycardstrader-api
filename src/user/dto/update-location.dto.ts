/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { IsLatitude, IsLongitude, IsNumber } from "class-validator";

export class UpdateLocationDto {
  @ApiProperty({ example: 48.8566, minimum: -90, maximum: 90 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 2.3522, minimum: -180, maximum: 180 })
  @IsNumber()
  @IsLongitude()
  longitude: number;
}
