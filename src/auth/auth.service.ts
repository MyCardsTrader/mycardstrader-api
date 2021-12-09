import { scryptSync } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  private async validateUser(email: string, pass: string): Promise<any> {
    const user: any = await this.userService.findOneByEmail(email);

    if (user && this.verifyPassword(pass, user.salt, user.password)) {
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
      access_token: this.jwtService.sign(payload),
    }
  }
}
