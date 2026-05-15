import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

  @ApiTags('health')
  @ApiOperation({ summary: 'Check API health status' })
  @ApiOkResponse({ description: 'API is up and returns its public URL.' })
  @Get('/health-check')
  getHealthCheck(): string {
    return this.appService.getHealthCheck();
  }

  @ApiTags('login')
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Authentication succeeded and JWT tokens metadata is returned.' })
  @ApiBadRequestResponse({ description: 'Login payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'User credentials are invalid.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected authentication error.' })
  @Post('auth/login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

}
