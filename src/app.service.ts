import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealthCheck(): string {
    return `App up and running on http://localhost/${this.configService.getOrThrow<number>('app.port')}`;
  }
}
