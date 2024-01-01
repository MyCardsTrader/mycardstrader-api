import { SearchService } from './search.service';
import { Controller, Get, Query} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('search')
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
    @Query('userId') userId?,
  ): Promise<any> {
    return await this.searchService
      .getCardsNearMe(lat, lng, distance, country, userId);
  }

  @ApiParam({
    name: 'lat',
    required: true,
    description: "Latitude for the search",
  })
  @ApiParam({
    name: 'lng',
    required: true,
    description: "Longitude for the search",
  })
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
  async searchCardByCritera(
    @Query('lat') lat,
    @Query('lng') lng,
    @Query('country') country,
    @Query('name') name,
    @Query('type') type,
    @Query('set') set,
  ): Promise<any> {
    return await this.searchService.findCards(lat, lng, country, name, type, set);
  }
}
