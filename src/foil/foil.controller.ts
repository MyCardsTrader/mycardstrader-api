import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';

import { FoilService } from './foil.service';

@ApiTags('foil')
@Controller('foil')
export class FoilController {
    constructor(private readonly foilService: FoilService) { }

    @ApiOperation({ summary: 'List foil options' })
    @ApiOkResponse({ description: 'Foil list returned successfully.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected foil lookup error.' })
    @Get()
    async getFoils(): Promise<string[]> {
        return await this.foilService.getFoils();
    }
}
