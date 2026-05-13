/* istanbul ignore file */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

const getJwtExpiresIn = (): SignOptions['expiresIn'] => {
  const expiresIn = Number.parseInt(process.env.JWT_EXPIRE ?? '60', 10);
  return Number.isNaN(expiresIn) ? 60 * 60 : expiresIn * 60;
};

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: process.env.JWT_SECRET ?? 'change-me',
        signOptions: { expiresIn: getJwtExpiresIn() },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }
