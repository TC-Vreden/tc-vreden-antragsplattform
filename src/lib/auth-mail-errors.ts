export function getAuthMailErrorMessage(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : "";
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("rate limit")) {
    return {
      message:
        "Supabase hat gerade zu viele Auth-E-Mails verschickt. Bitte einige Minuten warten und dann den Link erneut senden.",
      status: 429
    };
  }

  return {
    message: rawMessage || fallback,
    status: 500
  };
}
