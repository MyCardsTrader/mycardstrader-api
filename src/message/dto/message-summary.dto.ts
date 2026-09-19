/* istanbul ignore file */

import { ApiProperty } from "@nestjs/swagger";

export class MessageSummaryDto {
  @ApiProperty()
  tradeId: string;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty({ required: false, nullable: true })
  lastMessageAt: Date | null;
}
