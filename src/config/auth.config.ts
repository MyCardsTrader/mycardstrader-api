import { registerAs } from '@nestjs/config';
import { DEFAULT_JWT_EXPIRE_MINUTES, parseInteger } from './env';

export default registerAs('auth', () => {
  const jwtExpireMinutes = parseInteger(process.env.JWT_EXPIRE, DEFAULT_JWT_EXPIRE_MINUTES);

  return {
    jwtSecret: process.env.JWT_SECRET ?? 'change-me',
    jwtExpireMinutes,
    jwtExpiresInSeconds: jwtExpireMinutes * 60,
  };
});
