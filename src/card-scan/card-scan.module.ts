/* istanbul ignore file */
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { CardScanController } from "./controllers/card-scan.controller";
import { CardCropStorageService } from "./dataset/card-crop-storage.service";
import { CardCropService } from "./dataset/card-crop.service";
import { CreateDatasetSamplesService } from "./dataset/create-dataset-samples.service";
import { VerifyDatasetSampleService } from "./dataset/verify-dataset-sample.service";
import { BulkImportAccessGuard } from "./guards/bulk-import-access.guard";
import {
  CardScanSample,
  CardScanSampleSchema,
} from "./schemas/card-scan-sample.schema";
import { CardScan, CardScanSchema } from "./schemas/card-scan.schema";
import { CardPrintingResolver } from "./services/card-printing-resolver.service";
import { CardScanService } from "./services/card-scan.service";
import { OpenRouterService } from "./services/openrouter.service";
import { ProcessCardScanService } from "./services/process-card-scan.service";
import { ScryfallService } from "./services/scryfall.service";
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
    CardCropStorageService,
  ],
})
export class CardScanModule {}
