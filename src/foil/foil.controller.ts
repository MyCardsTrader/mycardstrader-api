import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';

import { FoilService } from './foil.service';

@ApiTags('foil')
@Controller('foil')
export class FoilController {
    constructor(private readonly foilService: FoilService) { }

    @Get()
    async getFoils(): Promise<string[]> {
        return await this.foilService.getFoils();
    }
}
