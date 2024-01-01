import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { LoginDto } from './auth/dto/login.dto';
import { AuthService } from './auth/auth.service';
import { Controller, Post, Body, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) { }

  @Get('/health-check')
  getHealthCheck(): string {
    return this.appService.getHealthCheck();
  }

  @ApiTags('login')
  @Post('auth/login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

}
