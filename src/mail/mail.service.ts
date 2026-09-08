import { readFile } from "fs/promises";
import { join } from "path";
import { compile } from "handlebars";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { RESEND_CLIENT } from "./mail.constants";
import { ResendClient, SendTemplateEmailOptions } from "./mail.types";

@Injectable()
export class MailService {
  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: ResendClient,
    private readonly configService: ConfigService,
  ) {}

  async sendTemplate(options: SendTemplateEmailOptions): Promise<string> {
    const templatePath = join(
      __dirname,
      "..",
      "templates",
      `${options.template}.hbs`,
    );
    const source = await readFile(templatePath, "utf8");
    const html = compile(source)(options.context);
    const { data, error } = await this.resend.emails.send({
      from: this.configService.getOrThrow<string>("mail.emailFrom"),
      to: options.to,
      subject: options.subject,
      html,
    });

    if (error) {
      throw new Error(`Resend email delivery failed: ${error.message}`);
    }

    return data.id;
  }
}
