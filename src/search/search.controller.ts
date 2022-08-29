import { SearchService } from './search.service';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiQuery({
    name: 'lat',
    required: true,
    description: "Longitude",
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    description: "Latitude",
  })
  @ApiQuery({
    name: 'distance',
    required: false,
    description: "Max distance in Km",
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: "Restrict to a country",
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
    description: "Restrict to a country",
  })
  @ApiParam({
    name: 'name',
    required: false,
    description: "Card name",
  })
  @ApiParam({
    name: 'type',
    required: false,
    description: "Card type",
  })
  @ApiParam({
    name: 'set',
    required: false,
    description: "Set id",
  })
  @Get()
  async searchCardByCritera(): Promise<any> {
    return await this.searchService.findCards();
  }
}
