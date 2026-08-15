import crypto from "crypto";

/**
 * Implementasi TOTP (RFC 6238) ringan — kompatibel dengan Google Authenticator.
 * Memakai HMAC-SHA1, 6 digit, periode 30 detik, base32 secret.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = "";
  for (const byte of buf) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  // pad
  while (out.length % 8 !== 0) out += "=";
  return out;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Karakter base32 tidak valid");
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const clean = token.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    if (computeTotp(secret, now + i * 30_000) === clean) {
      return true;
    }
  }
  return false;
}

function computeTotp(secret: string, timestamp: number): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binary % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Buat URL otpauth untuk QR code Google Authenticator. */
export function totpProvisioningUri(
  secret: string,
  accountName: string,
  issuer = "englishmudah.id",
): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&period=30&digits=6`;
}

/** Generate 10 kode recovery acak (8 karakter). */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 10; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += charset[crypto.randomInt(charset.length)];
    }
    codes.push(code);
  }
  return codes;
}
