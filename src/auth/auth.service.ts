import moment from 'moment';
import { scryptSync } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async validateUser(email: string, pass: string): Promise<any> {
    const user: any = await this.userService.findOneByEmail(email);

    if (user && this.verifyPassword(pass, user.salt, user.password) && !user.verify) {
      return {
        _id: user._id,
        email: user.email,
      };
    }
    return null;
  }

  private verifyPassword(password: string, salt: string, hash: string) {
    return hash === scryptSync(password, salt, 64).toString('hex');
  }

  async login(user): Promise<any> {
    const validatedUser = await this.validateUser(user.email, user.password);
    if (!validatedUser) {
      throw new UnauthorizedException('User not valid');
    }

    const payload = { sub: validatedUser._id };
    const jwtExpiresInSeconds = this.configService.getOrThrow<number>('auth.jwtExpiresInSeconds');
    const jwtExpireMinutes = this.configService.getOrThrow<number>('auth.jwtExpireMinutes');

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: jwtExpiresInSeconds }),
      expires_in: moment().add(jwtExpireMinutes, 'm'),
    }
  }
}
