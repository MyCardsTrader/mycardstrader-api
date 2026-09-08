import { registerAs } from "@nestjs/config";

export default registerAs("mail", () => ({
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  frontUrl: process.env.FRONT_URL ?? "",
}));
