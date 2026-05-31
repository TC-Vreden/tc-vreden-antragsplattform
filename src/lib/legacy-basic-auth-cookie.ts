export const LEGACY_BASIC_AUTH_COOKIE_NAME = "tcv_legacy_basic_auth";
export const LEGACY_BASIC_AUTH_COOKIE_MAX_AGE_SECONDS = 15 * 60;

const encoder = new TextEncoder();

function getTokenPayload(username: string, expiresAt: number) {
  return `v1:${username}:${expiresAt}`;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function signaturesMatch(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return difference === 0;
}

async function signLegacyBasicAuthPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return base64UrlEncode(new Uint8Array(signature));
}

export async function createLegacyBasicAuthCookieValue(
  username: string,
  password: string,
  now = Date.now()
) {
  const expiresAt = now + LEGACY_BASIC_AUTH_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = getTokenPayload(username, expiresAt);
  const signature = await signLegacyBasicAuthPayload(payload, password);

  return `v1.${expiresAt}.${signature}`;
}

export async function isLegacyBasicAuthCookieValueValid(
  value: string | null | undefined,
  username: string,
  password: string,
  now = Date.now()
) {
  if (!value) {
    return false;
  }

  const [version, expiresAtValue, signature] = value.split(".");
  const expiresAt = Number(expiresAtValue);

  if (version !== "v1" || !Number.isFinite(expiresAt) || !signature || expiresAt <= now) {
    return false;
  }

  const expectedSignature = await signLegacyBasicAuthPayload(
    getTokenPayload(username, expiresAt),
    password
  );

  return signaturesMatch(signature, expectedSignature);
}
