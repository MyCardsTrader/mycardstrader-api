import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, scryptSync } from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly mailerService: MailerService,
  ) { }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<User> {
    const salt = randomBytes(16).toString('hex');
    const password = scryptSync(createUserDto.password, salt, 64).toString('hex');
    const verify = randomUUID();

    const promocode = createUserDto.promocode;

    if (promocode) {
      delete createUserDto.promocode;
    }

    const newUserInfo = {
      ...createUserDto,
      password,
      salt,
      verify,
      usedPromocode: promocode? [promocode] : [],
    };

    try {
      const newUser = new this.userModel(newUserInfo);
      await this.mailerService.sendMail({
        to: createUserDto.email,
        from: process.env.EMAIL_FROM,
        subject: 'Welcome to NearbyCardTrader.com',
        template: 'welcome',
        context: {
          email: newUser.email,
          verify: newUser.verify,
          year: new Date().getFullYear(),
          frontUrl: process.env.FRONT_URL,
        },
      });
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

  async verifyUser(verify: string): Promise<User> {
    try {
      const user: User = await this.userModel.findOne({ verify });
      if (!user) {
        throw new Error('User not found');
      }
      return await this.userModel.findOneAndUpdate(
        { email: user.email},
        {
          $set: {
            verify: null,
          },
        },
      );
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      } else {
        throw new HttpException('Database error', 520);
      }
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      const user: User = await this.userModel.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      const resetToken = randomUUID();
      await this.userModel.findOneAndUpdate(
        { email: user.email},
        {
          $set: {
            resetToken: resetToken,
          },
        },
      );
      await this.mailerService.sendMail({
        to: email,
        from: process.env.EMAIL_FROM,
        subject: 'Reset your password NearbyCardTrader.com',
        template: 'reset-password',
        context: {
          email: email,
          resetToken: resetToken,
          frontUrl: process.env.FRONT_URL,
        },
      });
      return true;
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      } else {
        throw new HttpException('Database error', 520);
      }
    }
  }

  async changePassword(resetToken: string, password: string): Promise<User> {
    try {
      const user: User = await this.userModel.findOne({ resetToken });
      if (!user) {
        throw new Error('User not found');
      }
      const salt = randomBytes(16).toString('hex');
      const newPassword = scryptSync(password, salt, 64).toString('hex');
      const newUser = await this.userModel.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            password: newPassword,
            salt: salt,
            resetToken: null,
          },
        },
      );
      return newUser;
    } catch (error) {
      if (error.message === 'User not found') {
        throw new NotFoundException('User not found');
      } else {
        throw new HttpException('Database error', 520);
      }
    }
  };


  // async findOneById(id: string): Promise<User> {
  //   try {
  //     const user: User = await this.userModel
  //       .findById(
  //         id,
  //         { 
  //           password: 0,
  //           salt: 0,
  //           availableTreasures: 0,
  //           holdTreasures: 0,
  //           location: 0,
  //         }
  //       );
  //     if (!user) {
  //       throw new NotFoundException('User not found');
  //     }
  //     return user;
  //   } catch (error) {
  //     console.log('error: ', error);
  //     throw new HttpException('Database error', 520);
  //   }
  // }
}
