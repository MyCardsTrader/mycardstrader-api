import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  private static getStrategy() {
    return {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRE,
    }; 
  }

  /* istanbul ignore next */
  constructor() {
    super(JwtStrategy.getStrategy());
  }

  async validate(payload: any) {
    return { userId: payload.sub };
  }
}