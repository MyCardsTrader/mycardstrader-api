import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): string {
    return `App up and running on http://localhost/${process.env.PORT}`;
  }
}
