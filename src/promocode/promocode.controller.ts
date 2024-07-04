import { ApiQuery, ApiTags } from '@nestjs/swagger';
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
    @Get()
    async getPromocode(@Query('code') code: string): Promise<Promocode> {
        return await this.promocodeService.getPromocode(code);
    }
}
