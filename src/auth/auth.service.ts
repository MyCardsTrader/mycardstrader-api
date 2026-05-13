import moment from 'moment';
import { scryptSync } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

const getJwtExpiresIn = (): SignOptions['expiresIn'] => {
  const expiresIn = Number.parseInt(process.env.JWT_EXPIRE ?? '60', 10);
  return Number.isNaN(expiresIn) ? 60 * 60 : expiresIn * 60;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
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
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: getJwtExpiresIn() }),
      expires_in: moment().add(Number.parseInt(process.env.JWT_EXPIRE ?? '60', 10), 'm'),
    }
  }
}
