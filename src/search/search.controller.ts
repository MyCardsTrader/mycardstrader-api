import { Controller, Get, Query } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { last } from 'rxjs';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiQuery({
    name: 'lat',
    required: true,
  })
  @ApiQuery({
    name: 'lng',
    required: true,
  })
  @ApiQuery({
    name: 'distance',
    required: false,
  })
  @ApiQuery({
    name: 'country',
    required: false,
  })
  @Get('nearme')
  async searchNearMe(
    @Query('lat') lat,
    @Query('lng') lng,
    @Query('distance') distance,
    @Query('country') country,
  ): Promise<any> {
    return await this.searchService
      .getCardsNearMe(lat, lng, distance, country);
  }

  @ApiParam({
    name: 'country',
    required: false,
  })
  @ApiParam({
    name: 'name',
    required: false,
  })
  @ApiParam({
    name: 'type',
    required: false,
  })
  @ApiParam({
    name: 'edition',
    required: false,
  })
  @Get()
  async searchCardByCritera(): Promise<any> {
    return await this.searchService.findCards();
  }
}
