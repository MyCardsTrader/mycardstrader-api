export interface SendTemplateEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export interface ResendClient {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }): Promise<{
      data: { id: string } | null;
      error: { message: string } | null;
    }>;
  };
}
