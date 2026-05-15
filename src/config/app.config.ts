import { registerAs } from '@nestjs/config';
import { DEFAULT_PORT, parseInteger } from './env';

export default registerAs('app', () => ({
  port: parseInteger(process.env.PORT, DEFAULT_PORT),
  nodeEnv: process.env.NODE_ENV ?? 'development',
}));
