import { Controller, Post, Body, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { LoginDto } from './auth/dto/login.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) { }

  @Post('auth/login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Get('/health-check')
  getHealthCheck(): string {
    return this.appService.getHealthCheck();
  }
}
