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
@Module({
  imports: [
    AuthModule,
    UserModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: CardScan.name, schema: CardScanSchema },
    ]),
  ],
  controllers: [CardScanController],
  providers: [
    CardScanService,
    OpenRouterService,
    ScryfallService,
    CardPrintingResolver,
    BulkImportAccessGuard,
  ],
})
export class CardScanModule {}
