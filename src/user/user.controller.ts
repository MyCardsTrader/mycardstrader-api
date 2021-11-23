import { Body, Controller, Delete, Get, HttpException, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { User } from './schema/user.schema';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  async getUsers(): Promise<User[] | HttpException> {
    return await this.userService.findAll();
  }

  @Post()
  async createUser(
    @Body() userDto: CreateUserDto,
  ): Promise<User | HttpException> {
    return await this.userService.createUser(userDto);
  }

  @Delete()
  async deleteUser(
    @Body() deleteUserDto: DeleteUserDto 
  ): Promise<User | HttpException> {
    return await this.userService.deleteUser(deleteUserDto);
  }
}
