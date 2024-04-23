import { User } from './schema/user.schema';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DeleteUserDto } from './dto/delete-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  
  @ApiBearerAuth()
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
