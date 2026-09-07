import { Model } from "mongoose";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { CreateUserDto } from "./dto/create-user.dto";
import { DeleteUserDto } from "./dto/delete-user.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { ChangeAuthenticatedPasswordDto } from "./dto/change-authenticated-password.dto";
import { User, UserDocument } from "./schema/user.schema";
import { PromocodeService } from "../promocode/promocode.service";
import { MailService } from "../mail";

@Injectable()
export class UserService {
  constructor(
    private readonly mailService: MailService,
    private readonly promocodeService: PromocodeService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const salt = randomBytes(16).toString("hex");
    const password = scryptSync(createUserDto.password, salt, 64).toString(
      "hex",
    );
    const verify = randomUUID();

    const promocode = await this.promocodeService.getPromocode(
      createUserDto.promocode,
    );

    if (promocode) {
      delete createUserDto.promocode;
    }

    const newUserInfo = {
      ...createUserDto,
      password,
      salt,
      verify,
      usedPromocode: promocode ? [promocode.code] : [],
      availableCoins: promocode ? promocode.value : 0,
    };

    try {
      const newUser = new this.userModel(newUserInfo);
      await this.mailService.sendTemplate({
        to: createUserDto.email,
        subject: "Welcome to NearbyCardTrader.com",
        template: "welcome",
        context: {
          email: newUser.email,
          verify: newUser.verify,
          year: new Date().getFullYear(),
          frontUrl: this.configService.getOrThrow<string>("mail.frontUrl"),
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

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    let user: User;
    try {
      user = await this.userModel.findById(userId).exec();
    } catch {
      throw new InternalServerErrorException("Database error");
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toProfile(user);
  }

  async updateLocation(
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<ProfileResponseDto> {
    let user: User;
    try {
      user = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            $set: {
              location: {
                type: "Point",
                coordinates: [dto.longitude, dto.latitude],
              },
            },
          },
          { new: true },
        )
        .exec();
    } catch {
      throw new InternalServerErrorException("Database error");
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toProfile(user);
  }

  async changeAuthenticatedPassword(
    userId: string,
    dto: ChangeAuthenticatedPasswordDto,
  ): Promise<void> {
    let user: User;
    try {
      user = await this.userModel.findById(userId).exec();
    } catch {
      throw new InternalServerErrorException("Database error");
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.password || !user.salt) {
      throw new UnauthorizedException("Current password is invalid");
    }

    const currentHash = scryptSync(dto.currentPassword, user.salt, 64);
    const storedHash = Buffer.from(user.password, "hex");
    if (
      storedHash.length !== currentHash.length ||
      !timingSafeEqual(currentHash, storedHash)
    ) {
      throw new UnauthorizedException("Current password is invalid");
    }

    const salt = randomBytes(16).toString("hex");
    const password = scryptSync(dto.newPassword, salt, 64).toString("hex");
    let updatedUser: User;
    try {
      updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: userId, password: user.password, salt: user.salt },
          {
            $set: { password, salt },
            $unset: { resetToken: 1 },
          },
          { new: true },
        )
        .exec();
    } catch {
      throw new InternalServerErrorException("Database error");
    }

    if (!updatedUser) {
      throw new UnauthorizedException("Current password is no longer valid");
    }
  }

  private toProfile(user: User): ProfileResponseDto {
    const storedLocation = user.location as unknown as {
      type?: "Point";
      coordinates?: [number, number];
      lat?: number;
      lng?: number;
    };
    const location = Array.isArray(storedLocation.coordinates)
      ? user.location
      : {
          type: "Point" as const,
          coordinates: [storedLocation.lng, storedLocation.lat] as [
            number,
            number,
          ],
        };

    return {
      email: user.email,
      country: user.country,
      location,
      availableCoins: user.availableCoins ?? 0,
      holdCoins: user.holdCoins ?? 0,
      spentCoins: user.spentCoins ?? 0,
    };
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
      throw new HttpException("Database error", 520);
    }
  }

  async verifyUser(verify: string): Promise<User> {
    try {
      const user: User = await this.userModel.findOne({ verify });
      if (!user) {
        throw new Error("User not found");
      }
      return await this.userModel.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            verify: null,
          },
        },
      );
    } catch (error) {
      if (error.message === "User not found") {
        throw new NotFoundException("User not found");
      } else {
        throw new HttpException("Database error", 520);
      }
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      const user: User = await this.userModel.findOne({ email });
      if (!user) {
        throw new Error("User not found");
      }
      const resetToken = randomUUID();
      await this.userModel.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            resetToken: resetToken,
          },
        },
      );
      await this.mailService.sendTemplate({
        to: email,
        subject: "Reset your password NearbyCardTrader.com",
        template: "reset-password",
        context: {
          email: email,
          resetToken: resetToken,
          frontUrl: this.configService.getOrThrow<string>("mail.frontUrl"),
        },
      });
      return true;
    } catch (error) {
      if (error.message === "User not found") {
        throw new NotFoundException("User not found");
      } else {
        throw new HttpException("Database error", 520);
      }
    }
  }

  async changePassword(resetToken: string, password: string): Promise<User> {
    try {
      const user: User = await this.userModel.findOne({ resetToken });
      if (!user) {
        throw new Error("User not found");
      }
      const salt = randomBytes(16).toString("hex");
      const newPassword = scryptSync(password, salt, 64).toString("hex");
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
      if (error.message === "User not found") {
        throw new NotFoundException("User not found");
      } else {
        throw new HttpException("Database error", 520);
      }
    }
  }

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
