import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Patch,
  Request,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard";
import {
  BatchDeleteResponseDto,
  BatchDeleteCardsDto,
  BatchErrorDto,
  BatchUpdateResponseDto,
  BatchUpdateCardsDto,
} from "./dto";
import { CardBatchService } from "./card-batch.service";

export const batchValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Catch(BadRequestException)
export class BatchValidationFilter implements ExceptionFilter {
  catch(_error: BadRequestException, host: ArgumentsHost): void {
    host.switchToHttp().getResponse().status(400).json({
      code: "CARD_BATCH_INVALID",
      message:
        "Provide 1 to 100 unique card IDs and valid, non-empty editable fields only.",
    });
  }
}

@ApiTags("card")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(batchValidationPipe)
@UseFilters(new BatchValidationFilter())
@ApiBadRequestResponse({
  type: BatchErrorDto,
  description: "Invalid body; no writes.",
})
@ApiUnauthorizedResponse({
  description: "Missing, invalid or expired Bearer token.",
})
@ApiNotFoundResponse({
  type: BatchErrorDto,
  description: "Missing or foreign card; entire transaction aborted.",
})
@ApiConflictResponse({
  type: BatchErrorDto,
  description:
    "Unavailable card or changed selection; entire transaction aborted.",
})
@ApiInternalServerErrorResponse({
  type: BatchErrorDto,
  description:
    "Transaction failed or commit could not be confirmed. Refresh before retrying.",
})
@Controller("card/batch")
export class CardBatchController {
  constructor(private readonly batches: CardBatchService) {}

  @Patch()
  @ApiOperation({
    summary: "Transactionally update up to 100 cards in your binder",
    description:
      "All-or-nothing MongoDB transaction. Only language, grading and foil_treatment may change. No automatic splitting into separate transactions.",
  })
  @ApiBody({ type: BatchUpdateCardsDto })
  @ApiOkResponse({ type: BatchUpdateResponseDto })
  update(
    @Body() dto: BatchUpdateCardsDto,
    @Request() req: { user: { userId: string } },
  ): Promise<BatchUpdateResponseDto> {
    return this.batches.update(dto, req.user.userId);
  }

  @Delete()
  @ApiOperation({
    summary: "Transactionally delete up to 100 cards from your binder",
    description:
      "JSON body required. All-or-nothing transaction. Repeated deletion of an absent card aborts the batch with CARD_BATCH_NOT_FOUND.",
  })
  @ApiBody({ type: BatchDeleteCardsDto })
  @ApiOkResponse({ type: BatchDeleteResponseDto })
  delete(
    @Body() dto: BatchDeleteCardsDto,
    @Request() req: { user: { userId: string } },
  ): Promise<BatchDeleteResponseDto> {
    return this.batches.delete(dto, req.user.userId);
  }
}
