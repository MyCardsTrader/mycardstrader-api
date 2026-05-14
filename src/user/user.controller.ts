import { User } from './schema/user.schema';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DeleteUserDto } from './dto/delete-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ description: 'Users list returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected database error.' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(): Promise<User[]> {
    return await this.userService.findAll();
  }

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiParam({
  //   name: 'userId',
  //   required: true,
  // })
  // @Get(':userId')
  // async getUserById(@Param('userId') userId): Promise<User> {
  //   return await this.userService.findOneById(userId);
  // }

  @ApiOperation({ summary: 'Create a new user account' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'User created successfully.' })
  @ApiBadRequestResponse({ description: 'User payload is invalid.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected user creation error.' })
  @Post()
  async createUser(
    @Body() userDto: CreateUserDto,
  ): Promise<User> {
    return await this.userService.createUser(userDto);
  }

  @ApiOperation({ summary: 'Delete a user by id' })
  @ApiBody({ type: DeleteUserDto })
  @ApiOkResponse({ description: 'User deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Delete payload is invalid.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected deletion error.' })
  @Delete()
  async deleteUser(
    @Body() deleteUserDto: DeleteUserDto 
  ): Promise<User> {
    return await this.userService.deleteUser(deleteUserDto);
  }

  @ApiOperation({ summary: 'Verify a user account' })
  @ApiParam({ name: 'verify', required: true, description: 'Verification token' })
  @ApiOkResponse({ description: 'User verification succeeded.' })
  @ApiNotFoundResponse({ description: 'Verification token is invalid or expired.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected verification error.' })
  @Get('/verify/:verify')
  async verifyUser(@Param('verify') verify: string): Promise<User> {
    return await this.userService.verifyUser(verify);
  }

  @ApiOperation({ summary: 'Request a password reset' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password reset email sent successfully.' })
  @ApiBadRequestResponse({ description: 'Reset password payload is invalid.' })
  @ApiNotFoundResponse({ description: 'No user exists for the provided email.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected reset password error.' })
  @Post('/reset-password')
  async resetPassword(@Body() resetPasswordDto: { email: string }): Promise<boolean> {
    return await this.userService.resetPassword(resetPasswordDto.email);
  }

  @ApiOperation({ summary: 'Change a password using a reset token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resetToken', 'password'],
      properties: {
        resetToken: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password changed successfully.' })
  @ApiBadRequestResponse({ description: 'Change password payload is invalid.' })
  @ApiNotFoundResponse({ description: 'Reset token is invalid or expired.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected password change error.' })
  @Post('/change-password')
  async changePassword(@Body() changePasswordDto: { resetToken: string, password: string }): Promise<User> {
    return await this.userService.changePassword(changePasswordDto.resetToken, changePasswordDto.password);
  }
}
