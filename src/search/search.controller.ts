import { SearchService } from './search.service';
import { Controller, Get, Query} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

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
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Authenticated user id to exclude from results',
  })
  @ApiOperation({ summary: 'Search nearby available cards around a geographic point' })
  @ApiOkResponse({ description: 'Nearby cards returned successfully.' })
  @ApiBadRequestResponse({ description: 'Search query parameters are invalid.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected search error.' })
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

  @ApiQuery({
    name: 'lat',
    required: true,
    description: "Latitude for the search",
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    description: "Longitude for the search",
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: "Restrict to a country",
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: "Card name",
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: "Card type",
  })
  @ApiQuery({
    name: 'set',
    required: false,
    description: "Set id",
  })
  @ApiOperation({ summary: 'Search cards using geographic and card criteria' })
  @ApiOkResponse({ description: 'Card search completed successfully.' })
  @ApiBadRequestResponse({ description: 'Search query parameters are invalid.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected search error.' })
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
