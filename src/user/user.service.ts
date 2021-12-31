import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, scryptSync } from 'crypto';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<User> {
    const salt = randomBytes(16).toString('hex');
    const password = scryptSync(createUserDto.password, salt, 64).toString('hex');

    const newUserInfo = {
      ...createUserDto,
      password,
      salt,
    };

    try {
      const newUser = new this.userModel(newUserInfo);
      return await newUser.save();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.userModel.find({}).exec();
    } catch (error) {
      throw new HttpException(error.message, 520);
    }
  }

  async deleteUser(deleteUserDto: DeleteUserDto): Promise<User> {
    try {
      return await this.userModel.findOneAndDelete({ _id: deleteUserDto.id });
    } catch (error) {
      throw new HttpException(error.message, 404);
    }
  }

  async findOneByEmail(email: string): Promise<User> {
    try {
      const user: User = await this.userModel.findOne({ email });
      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      throw new HttpException('Database error', 520);
    }
  }
}
