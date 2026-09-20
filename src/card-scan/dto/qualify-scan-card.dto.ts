/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
export class QualifyScanCardDto {
  @ApiProperty() @IsUUID() scryfallId: string;
}
