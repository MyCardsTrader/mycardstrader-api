/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { UserLocation } from "../schema/user.schema";

export class ProfileResponseDto {
  @ApiProperty({ format: "email", example: "nemo@example.com" })
  email: string;

  @ApiProperty({ example: "FR" })
  country: string;

  @ApiProperty({
    example: { type: "Point", coordinates: [2.3522, 48.8566] },
  })
  location: UserLocation;

  @ApiProperty({ example: 12, description: "Available trade tokens" })
  availableCoins: number;

  @ApiProperty({
    example: 2,
    description: "Trade tokens reserved by an active trade",
  })
  holdCoins: number;

  @ApiProperty({ example: 4, description: "Spent trade tokens" })
  spentCoins: number;
}
