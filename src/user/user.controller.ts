import { User } from './schema/user.schema';
import { UserService } from './user.service';
import { DeleteUserDto } from './dto/delete-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Body, Controller, Delete, Get, HttpException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(): Promise<User[]> {
    return await this.userService.findAll();
  }

  @Post()
  async createUser(
    @Body() userDto: CreateUserDto,
  ): Promise<User> {
    return await this.userService.createUser(userDto);
  }

  @Delete()
  async deleteUser(
    @Body() deleteUserDto: DeleteUserDto 
  ): Promise<User> {
    return await this.userService.deleteUser(deleteUserDto);
  }
}
