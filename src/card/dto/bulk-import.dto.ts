import { IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import { CreateCardDto } from "./create-card.dto";

export class BulkImportDto {
    @ApiProperty({
        required: true,
        type: [CreateCardDto],
        description: 'List of cards to be imported',
    })
    @IsNotEmpty()
    cards: CreateCardDto[];
}