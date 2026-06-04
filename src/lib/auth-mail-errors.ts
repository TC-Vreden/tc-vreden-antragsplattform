export function getAuthMailErrorMessage(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : "";
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("rate limit")) {
    return {
      message:
        "Supabase hat den Auth-Mailversand begrenzt. Mit dem Standardversand sind nur sehr wenige Einladungs- und Passwortmails pro Stunde möglich; bitte später erneut senden oder Supabase Auth auf Custom SMTP umstellen.",
      status: 429
    };
  }

  return {
    message: rawMessage || fallback,
    status: 500
  };
}
