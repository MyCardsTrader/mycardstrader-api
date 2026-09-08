import { User } from "./schema/user.schema";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { DeleteUserDto } from "./dto/delete-user.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { ChangeAuthenticatedPasswordDto } from "./dto/change-authenticated-password.dto";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: "List all users" })
  @ApiOkResponse({ description: "Users list returned successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiInternalServerErrorResponse({ description: "Unexpected database error." })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(): Promise<User[]> {
    return await this.userService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user profile" })
  @ApiOkResponse({
    description:
      "The authenticated user profile is returned without credentials.",
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiNotFoundResponse({
    description: "The authenticated user no longer exists.",
  })
  @ApiInternalServerErrorResponse({ description: "Unexpected database error." })
  @UseGuards(JwtAuthGuard)
  @Get("/me")
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return await this.userService.getProfile(req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated user geolocation" })
  @ApiBody({ type: UpdateLocationDto })
  @ApiOkResponse({
    description: "The location was updated.",
    type: ProfileResponseDto,
  })
  @ApiBadRequestResponse({ description: "Latitude or longitude is invalid." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiNotFoundResponse({
    description: "The authenticated user no longer exists.",
  })
  @ApiInternalServerErrorResponse({ description: "Unexpected database error." })
  @UseGuards(JwtAuthGuard)
  @Patch("/me/location")
  async updateLocation(
    @Request() req,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<ProfileResponseDto> {
    return await this.userService.updateLocation(
      req.user.userId,
      updateLocationDto,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the authenticated user password" })
  @ApiBody({ type: ChangeAuthenticatedPasswordDto })
  @ApiNoContentResponse({
    description: "The password was changed successfully.",
  })
  @ApiBadRequestResponse({ description: "The password payload is invalid." })
  @ApiUnauthorizedResponse({
    description: "Authentication failed or the current password is invalid.",
  })
  @ApiNotFoundResponse({
    description: "The authenticated user no longer exists.",
  })
  @ApiInternalServerErrorResponse({ description: "Unexpected database error." })
  @UseGuards(JwtAuthGuard)
  @Patch("/me/password")
  @HttpCode(204)
  async changeAuthenticatedPassword(
    @Request() req,
    @Body() passwordDto: ChangeAuthenticatedPasswordDto,
  ): Promise<void> {
    await this.userService.changeAuthenticatedPassword(
      req.user.userId,
      passwordDto,
    );
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

  @ApiOperation({ summary: "Create a new user account" })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: "User created successfully." })
  @ApiBadRequestResponse({ description: "User payload is invalid." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected user creation error.",
  })
  @Post()
  async createUser(@Body() userDto: CreateUserDto): Promise<User> {
    return await this.userService.createUser(userDto);
  }

  @ApiOperation({ summary: "Delete a user by id" })
  @ApiBody({ type: DeleteUserDto })
  @ApiOkResponse({ description: "User deleted successfully." })
  @ApiBadRequestResponse({ description: "Delete payload is invalid." })
  @ApiInternalServerErrorResponse({ description: "Unexpected deletion error." })
  @Delete()
  async deleteUser(@Body() deleteUserDto: DeleteUserDto): Promise<User> {
    return await this.userService.deleteUser(deleteUserDto);
  }

  @ApiOperation({ summary: "Verify a user account" })
  @ApiParam({
    name: "verify",
    required: true,
    description: "Verification token",
  })
  @ApiOkResponse({ description: "User verification succeeded." })
  @ApiNotFoundResponse({
    description: "Verification token is invalid or expired.",
  })
  @ApiInternalServerErrorResponse({
    description: "Unexpected verification error.",
  })
  @Get("/verify/:verify")
  async verifyUser(@Param("verify") verify: string): Promise<User> {
    return await this.userService.verifyUser(verify);
  }

  @ApiOperation({ summary: "Request a password reset" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
      },
    },
  })
  @ApiOkResponse({ description: "Password reset email sent successfully." })
  @ApiBadRequestResponse({ description: "Reset password payload is invalid." })
  @ApiNotFoundResponse({
    description: "No user exists for the provided email.",
  })
  @ApiInternalServerErrorResponse({
    description: "Unexpected reset password error.",
  })
  @Post("/reset-password")
  async resetPassword(
    @Body() resetPasswordDto: { email: string },
  ): Promise<boolean> {
    return await this.userService.resetPassword(resetPasswordDto.email);
  }

  @ApiOperation({ summary: "Change a password using a reset token" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["resetToken", "password"],
      properties: {
        resetToken: { type: "string" },
        password: { type: "string" },
      },
    },
  })
  @ApiOkResponse({ description: "Password changed successfully." })
  @ApiBadRequestResponse({ description: "Change password payload is invalid." })
  @ApiNotFoundResponse({ description: "Reset token is invalid or expired." })
  @ApiInternalServerErrorResponse({
    description: "Unexpected password change error.",
  })
  @Post("/change-password")
  async changePassword(
    @Body() changePasswordDto: { resetToken: string; password: string },
  ): Promise<User> {
    return await this.userService.changePassword(
      changePasswordDto.resetToken,
      changePasswordDto.password,
    );
  }
}
