import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Query } from '@nestjs/common';

import { Promocode } from './schema/promocode.schema';
import { PromocodeService } from './promocode.service';

@ApiTags('promocode')
@Controller('promocode')
export class PromocodeController {
    constructor(private readonly promocodeService: PromocodeService) {}
    
    @ApiQuery({
        name: 'code',
        required: true,
        description: "Promocode",
        example: 'PROMO',
    })
    @ApiOperation({ summary: 'Get a promocode by code' })
    @ApiOkResponse({ description: 'Promocode returned successfully.' })
    @ApiBadRequestResponse({ description: 'Promocode query parameters are invalid.' })
    @ApiNotFoundResponse({ description: 'Promocode was not found.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected promocode lookup error.' })
    @Get()
    async getPromocode(@Query('code') code: string): Promise<Promocode> {
        return await this.promocodeService.getPromocode(code);
    }
}
