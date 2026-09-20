import { SearchService } from "./search.service";
import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiQuery({
    name: "lat",
    required: true,
    description: "Longitude",
  })
  @ApiQuery({
    name: "lng",
    required: true,
    description: "Latitude",
  })
  @ApiQuery({
    name: "distance",
    required: false,
    description: "Max distance in Km",
  })
  @ApiQuery({
    name: "country",
    required: false,
    description: "Restrict to a country",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Authenticated user id to exclude from results",
  })
  @ApiOperation({
    summary: "Search nearby available cards around a geographic point",
  })
  @ApiOkResponse({
    description:
      "Nearby cards with binder display metadata and all frontend filter fields. cardName is retained for older clients. Owner email addresses are not returned.",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cardId: { type: "string" },
          userId: { type: "string" },
          distance: { type: "number" },
          cardName: { type: "string", example: "Sol Ring" },
          name: { type: "string", example: "Sol Ring" },
          cmc: { type: "string", example: "1" },
          legalities: {
            type: "object",
            additionalProperties: { type: "string" },
            example: { commander: "legal", standard: "not_legal" },
          },
          color_identity: {
            type: "array",
            items: { type: "string" },
            example: ["W", "U"],
          },
          type_line: { type: "string", example: "Artifact" },
          keywords: {
            type: "array",
            items: { type: "string" },
            example: ["Flying"],
          },
          foil_treatment: { type: "string", example: "etched foil" },
          lang: { type: "string", example: "fr" },
          grading: { type: "string", example: "near mint" },
          set: { type: "string", example: "cmm" },
          collector_number: { type: "string", example: "396" },
          image_uris: {
            oneOf: [
              { type: "object" },
              { type: "array", items: { type: "object" } },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 520, description: "The nearby search query failed." })
  @ApiBadRequestResponse({
    description: "Search query parameters are invalid.",
  })
  @ApiInternalServerErrorResponse({ description: "Unexpected search error." })
  @Get("nearme")
  async searchNearMe(
    @Query("lat") lat,
    @Query("lng") lng,
    @Query("distance") distance,
    @Query("country") country,
    @Query("userId") userId?,
  ): Promise<any> {
    return await this.searchService.getCardsNearMe(
      lat,
      lng,
      distance,
      country,
      userId,
    );
  }

  @ApiQuery({
    name: "lat",
    required: true,
    description: "Latitude for the search",
  })
  @ApiQuery({
    name: "lng",
    required: true,
    description: "Longitude for the search",
  })
  @ApiQuery({
    name: "country",
    required: false,
    description: "Restrict to a country",
  })
  @ApiQuery({
    name: "name",
    required: false,
    description: "Card name",
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Card type",
  })
  @ApiQuery({
    name: "set",
    required: false,
    description: "Set id",
  })
  @ApiOperation({ summary: "Search cards using geographic and card criteria" })
  @ApiOkResponse({ description: "Card search completed successfully." })
  @ApiBadRequestResponse({
    description: "Search query parameters are invalid.",
  })
  @ApiInternalServerErrorResponse({ description: "Unexpected search error." })
  @Get()
  async searchCardByCritera(
    @Query("lat") lat,
    @Query("lng") lng,
    @Query("country") country,
    @Query("name") name,
    @Query("type") type,
    @Query("set") set,
  ): Promise<any> {
    return await this.searchService.findCards(
      lat,
      lng,
      country,
      name,
      type,
      set,
    );
  }
}
