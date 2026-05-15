import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';

import { SetService } from './set.service';

@ApiTags('set')
@Controller('set')
export class SetController {
    constructor(private readonly setService: SetService) { }
    @ApiOperation({ summary: 'List all card sets' })
    @ApiOkResponse({ description: 'Sets returned successfully.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected set lookup error.' })
    @Get()
    async getSets(): Promise<any> {
        return await this.setService.findAll();
    }
}
