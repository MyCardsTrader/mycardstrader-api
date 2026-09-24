import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { BulkImportAccessGuard } from "./bulk-import-access.guard";
import { DEFAULT_CARD_SCAN_MAX_IMAGE_BYTES } from "../config";
import { CardScanService } from "./card-scan.service";
import { UploadedImage } from "./card-scan.types";
import { ListCardScansQueryDto, QualifyScanCardDto } from "./dto";
import { CardScan } from "./schema/card-scan.schema";
@ApiTags("card-scans")
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: "AI-assisted bulk import is not enabled for this user.",
})
@UseGuards(JwtAuthGuard, BulkImportAccessGuard)
@Controller("card-scans")
export class CardScanController {
  constructor(private readonly service: CardScanService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { files: 1, fileSize: DEFAULT_CARD_SCAN_MAX_IMAGE_BYTES },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Recognize and validate up to 60 cards in one image",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["image"],
      properties: { image: { type: "string", format: "binary" } },
    },
  })
  @ApiCreatedResponse({ description: "Scan processed and stored." })
  @ApiBadRequestResponse({
    description: "Image is missing, too large, or unsupported.",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiUnprocessableEntityResponse({
    description:
      "No cards were detected or more than 60 physical cards were detected.",
  })
  @ApiBadGatewayResponse({ description: "The model returned invalid data." })
  @ApiGatewayTimeoutResponse({ description: "Card recognition timed out." })
  @ApiServiceUnavailableResponse({
    description: "OpenRouter or Scryfall is unavailable.",
  })
  createScan(
    @Request() req,
    @UploadedFile() image?: UploadedImage,
  ): Promise<CardScan> {
    return this.service.createScan(req.user.userId, image);
  }
  @Get()
  @ApiOperation({ summary: "List the authenticated user's card scans" })
  @ApiQuery({ name: "status", required: false })
  @ApiOkResponse({ description: "Card scans returned." })
  @ApiBadRequestResponse({ description: "The status filter is invalid." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  listScans(
    @Request() req,
    @Query() query: ListCardScansQueryDto,
  ): Promise<CardScan[]> {
    return this.service.listScans(req.user.userId, query.status);
  }
  @Get(":scanId")
  @ApiOperation({ summary: "Get one owned card scan" })
  @ApiParam({ name: "scanId" })
  @ApiOkResponse({ description: "Card scan returned." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiNotFoundResponse({ description: "Card scan was not found." })
  getScan(@Request() req, @Param("scanId") scanId: string): Promise<CardScan> {
    return this.service.getScan(req.user.userId, scanId);
  }
  @Patch(":scanId/imported")
  @ApiOperation({ summary: "Mark an owned scan as imported" })
  @ApiParam({ name: "scanId" })
  @ApiOkResponse({ description: "Card scan marked as imported." })
  @ApiBadRequestResponse({
    description: "Ambiguous cards still require qualification.",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiNotFoundResponse({ description: "Card scan was not found." })
  markImported(
    @Request() req,
    @Param("scanId") scanId: string,
  ): Promise<CardScan> {
    return this.service.markImported(req.user.userId, scanId);
  }
  @Patch(":scanId/cards/:cardId")
  @ApiOperation({ summary: "Select a validated printing for a scanned card" })
  @ApiParam({ name: "scanId" })
  @ApiParam({ name: "cardId" })
  @ApiBody({ type: QualifyScanCardDto })
  @ApiOkResponse({ description: "Scanned card qualified." })
  @ApiBadRequestResponse({
    description: "The printing is not a validated candidate.",
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiNotFoundResponse({ description: "Scan or scanned card was not found." })
  qualifyCard(
    @Request() req,
    @Param("scanId") scanId: string,
    @Param("cardId") cardId: string,
    @Body() body: QualifyScanCardDto,
  ): Promise<CardScan> {
    return this.service.qualifyCard(
      req.user.userId,
      scanId,
      cardId,
      body.scryfallId,
    );
  }
}
