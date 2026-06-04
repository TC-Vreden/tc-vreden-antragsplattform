import nodemailer from "nodemailer";

export type MailDeliveryStatus = "sent" | "skipped" | "failed";

export type MailDeliveryResult = {
  status: MailDeliveryStatus;
  reason?: string;
  messageId?: string;
};

export type MailProvider = "resend" | "smtp";

type MailAddressList = string | string[];

export type ConfiguredMailAttachment = {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
};

export type ConfiguredMailPayload = {
  from: string;
  to: MailAddressList;
  bcc?: MailAddressList;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: ConfiguredMailAttachment[];
};

export type ConfiguredMailTransportSettings = {
  provider?: "auto" | MailProvider;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number | string;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export function getMailEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function isTruthyMailValue(value: string | undefined) {
  return ["1", "true", "yes", "ja"].includes(value?.toLowerCase() ?? "");
}

export function getAdminPortalUrl() {
  const explicitUrl = getMailEnv("ADMIN_PORTAL_URL");

  if (explicitUrl) {
    return explicitUrl;
  }

  const siteUrl = getMailEnv("NEXT_PUBLIC_SITE_URL");
  if (siteUrl) {
    return `${siteUrl.replace(/\/$/, "")}/verwaltung`;
  }

  const vercelUrl = getMailEnv("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}/verwaltung`;
  }

  return undefined;
}

function getMailProvider(settings?: ConfiguredMailTransportSettings): MailProvider {
  const provider = settings?.provider === "auto" ? undefined : settings?.provider;

  if (provider === "smtp" || provider === "resend") {
    return provider;
  }

  const envProvider = getMailEnv("MAIL_PROVIDER")?.toLowerCase();

  if (envProvider === "smtp" || envProvider === "resend") {
    return envProvider;
  }

  return settings?.smtpHost || getMailEnv("SMTP_HOST") ? "smtp" : "resend";
}

function getSmtpPort(settings?: ConfiguredMailTransportSettings) {
  const rawPort = settings?.smtpPort ?? getMailEnv("SMTP_PORT");

  if (!rawPort) {
    return 465;
  }

  const port = typeof rawPort === "number" ? rawPort : Number.parseInt(rawPort, 10);

  return Number.isFinite(port) ? port : 465;
}

function getSmtpSecure(port: number, settings?: ConfiguredMailTransportSettings) {
  if (typeof settings?.smtpSecure === "boolean") {
    return settings.smtpSecure;
  }

  const rawSecure = getMailEnv("SMTP_SECURE");

  if (!rawSecure) {
    return port === 465;
  }

  return isTruthyMailValue(rawSecure);
}

function toAddressArray(value: MailAddressList | undefined) {
  if (!value) {
    return undefined;
  }

  const addresses = Array.isArray(value) ? value : value.split(",");
  const cleanedAddresses = addresses.map((address) => address.trim()).filter(Boolean);

  return cleanedAddresses.length > 0 ? cleanedAddresses : undefined;
}

function toSmtpAttachments(attachments: ConfiguredMailAttachment[] | undefined) {
  return attachments?.map((attachment) => ({
    filename: attachment.filename,
    content:
      typeof attachment.content === "string" || Buffer.isBuffer(attachment.content)
        ? attachment.content
        : Buffer.from(attachment.content),
    contentType: attachment.contentType
  }));
}

async function sendWithResend(
  payload: ConfiguredMailPayload,
  settings?: ConfiguredMailTransportSettings
): Promise<MailDeliveryResult> {
  const apiKey = settings?.resendApiKey ?? getMailEnv("RESEND_API_KEY");
  const to = toAddressArray(payload.to);

  if (!apiKey) {
    return {
      status: "skipped",
      reason: "RESEND_API_KEY fehlt."
    };
  }

  if (!to) {
    return {
      status: "skipped",
      reason: "Mail-Empfänger fehlt."
    };
  }

  const responsePayload = {
    from: payload.from,
    to,
    bcc: toAddressArray(payload.bcc),
    reply_to: payload.replyTo,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: payload.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content:
        typeof attachment.content === "string"
          ? attachment.content
          : Buffer.from(attachment.content).toString("base64"),
      content_type: attachment.contentType
    }))
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responsePayload)
    });

    const data = (await response.json().catch(() => ({}))) as ResendSendResponse;

    if (!response.ok) {
      return {
        status: "failed",
        reason: data.message || data.name || `Resend HTTP ${response.status}`
      };
    }

    return {
      status: "sent",
      messageId: data.id
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter Mailfehler"
    };
  }
}

async function sendWithSmtp(
  payload: ConfiguredMailPayload,
  settings?: ConfiguredMailTransportSettings
): Promise<MailDeliveryResult> {
  const host = settings?.smtpHost ?? getMailEnv("SMTP_HOST");
  const user = settings?.smtpUser ?? getMailEnv("SMTP_USER");
  const pass = settings?.smtpPassword ?? getMailEnv("SMTP_PASSWORD");
  const port = getSmtpPort(settings);

  if (!host || !user || !pass) {
    return {
      status: "skipped",
      reason: "SMTP_HOST, SMTP_USER oder SMTP_PASSWORD fehlt."
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: getSmtpSecure(port, settings),
    auth: {
      user,
      pass
    }
  });

  try {
    const info = await transporter.sendMail({
      from: payload.from,
      to: toAddressArray(payload.to),
      bcc: toAddressArray(payload.bcc),
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: toSmtpAttachments(payload.attachments)
    });

    return {
      status: "sent",
      messageId: info.messageId
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Unbekannter SMTP-Mailfehler"
    };
  }
}

export async function sendConfiguredMail(
  payload: ConfiguredMailPayload,
  settings?: ConfiguredMailTransportSettings
): Promise<MailDeliveryResult> {
  if (getMailProvider(settings) === "smtp") {
    return sendWithSmtp(payload, settings);
  }

  return sendWithResend(payload, settings);
}
