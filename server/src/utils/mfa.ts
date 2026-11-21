import crypto from "node:crypto";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  return encodeBase32(crypto.randomBytes(20));
}

export function buildTotpUri(secret: string, account: string, issuer = "OSINT-X"): string {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset += 1) {
    if (timingSafeEqual(generateTotp(secret, counter + offset), code)) return true;
  }
  return false;
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => `${crypto.randomBytes(4).toString("hex")}-${crypto.randomBytes(4).toString("hex")}`);
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/\s/g, "").toLowerCase()).digest("hex");
}

export function consumeRecoveryCode(code: string, hashes: string[]): { valid: boolean; remaining: string[] } {
  const candidate = hashRecoveryCode(code);
  const index = hashes.findIndex((hash) => timingSafeEqual(hash, candidate));
  if (index < 0) return { valid: false, remaining: hashes };
  return { valid: true, remaining: hashes.filter((_, hashIndex) => hashIndex !== index) };
}

function generateTotp(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(Math.max(0, counter)));
  const digest = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { result += base32Alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) result += base32Alphabet[(value << (5 - bits)) & 31];
  return result;
}

function decodeBase32(value: string): Buffer {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const character of value.replace(/=+$/, "").toUpperCase()) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) { output.push((buffer >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
