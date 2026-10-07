/* istanbul ignore file */
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { BulkImportAccessGuard } from "./bulk-import-access.guard";
import { CardPrintingResolver } from "./card-printing-resolver.service";
import { CardScanController } from "./card-scan.controller";
import { CardScanService } from "./card-scan.service";
import { OpenRouterService } from "./openrouter.service";
import { CardScan, CardScanSchema } from "./schema/card-scan.schema";
import { ScryfallService } from "./scryfall.service";
import { ProcessCardScanService } from "./application/process-card-scan.service";
import { CreateDatasetSamplesService } from "./application/create-dataset-samples.service";
import { VerifyDatasetSampleService } from "./application/verify-dataset-sample.service";
import { CardCropService } from "./infrastructure/image/card-crop.service";
import {
  CardScanSample,
  CardScanSampleSchema,
} from "./infrastructure/persistence/card-scan-sample.schema";
import { CARD_CROP_STORAGE } from "./infrastructure/storage/card-crop-storage";
import { S3CardCropStorage } from "./infrastructure/storage/s3-card-crop.storage";
@Module({
  imports: [
    AuthModule,
    UserModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: CardScan.name, schema: CardScanSchema },
      { name: CardScanSample.name, schema: CardScanSampleSchema },
    ]),
  ],
  controllers: [CardScanController],
  providers: [
    CardScanService,
    OpenRouterService,
    ScryfallService,
    CardPrintingResolver,
    BulkImportAccessGuard,
    ProcessCardScanService,
    CreateDatasetSamplesService,
    VerifyDatasetSampleService,
    CardCropService,
    S3CardCropStorage,
    { provide: CARD_CROP_STORAGE, useExisting: S3CardCropStorage },
  ],
})
export class CardScanModule {}
