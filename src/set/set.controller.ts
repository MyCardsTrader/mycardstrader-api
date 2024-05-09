import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';

import { SetService } from './set.service';

@ApiTags('set')
@Controller('set')
export class SetController {
    constructor(private readonly setService: SetService) { }
    @Get()
    async getSets(): Promise<any> {
        return await this.setService.findAll();
    }
}
