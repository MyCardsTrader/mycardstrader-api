import { ConfigService } from "@nestjs/config";

import { MailService } from "./mail.service";
import { ResendClient } from "./mail.types";

describe("MailService", () => {
  const sendMock = jest.fn();
  const resend = {
    emails: {
      send: sendMock,
    },
  } as ResendClient;
  const configService = {
    getOrThrow: jest
      .fn()
      .mockReturnValue("NearbyCardTrader <noreply@nearbycardtrader.com>"),
  } as unknown as ConfigService;
  const service = new MailService(resend, configService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders and sends an existing Handlebars template through Resend", async () => {
    sendMock.mockResolvedValue({
      data: { id: "email-id" },
      error: null,
    });

    await expect(
      service.sendTemplate({
        to: "captain.nemo@nautilus.sub",
        subject: "Welcome",
        template: "welcome",
        context: {
          email: "captain.nemo@nautilus.sub",
          verify: "verification-token",
          year: 2026,
          frontUrl: "https://nearbycardtrader.com",
        },
      }),
    ).resolves.toBe("email-id");

    expect(sendMock).toHaveBeenCalledWith({
      from: "NearbyCardTrader <noreply@nearbycardtrader.com>",
      to: "captain.nemo@nautilus.sub",
      subject: "Welcome",
      html: expect.stringContaining(
        "https://nearbycardtrader.com/verify/verification-token",
      ),
    });
  });

  it("throws a clear error when Resend rejects the email", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Domain is not verified" },
    });

    await expect(
      service.sendTemplate({
        to: "captain.nemo@nautilus.sub",
        subject: "Reset password",
        template: "reset-password",
        context: {
          email: "captain.nemo@nautilus.sub",
          resetToken: "reset-token",
          frontUrl: "https://nearbycardtrader.com",
        },
      }),
    ).rejects.toThrow("Resend email delivery failed: Domain is not verified");
  });
});
