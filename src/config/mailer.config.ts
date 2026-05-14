import { registerAs } from '@nestjs/config';

export default registerAs('mailer', () => ({
  smtpUri: process.env.SMTP_URI ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  frontUrl: process.env.FRONT_URL ?? '',
}));
