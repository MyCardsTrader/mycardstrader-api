/* istanbul ignore file */

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ScryfallCardSyncService } from "./scryfall-card-sync.service";

const logger = new Logger("ScryfallCardSyncCommand");

async function bootstrap(): Promise<void> {
  const application = await NestFactory.createApplicationContext(AppModule);
  try {
    const result = await application.get(ScryfallCardSyncService).synchronize();
    logger.log(
      `Manual synchronization completed: ${result.processed} cards in ${result.batches} batches`,
    );
  } catch (error) {
    logger.error("Manual synchronization failed", error);
    process.exitCode = 1;
  } finally {
    await application.close();
  }
}

void bootstrap();
