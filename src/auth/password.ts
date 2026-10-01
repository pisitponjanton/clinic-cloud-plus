import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Mockup-MVP credential verification.
 *
 * The seeded JSON intentionally stores a deterministic SHA-256 representation
 * of the shared demo password. This is not a production password-storage
 * design and must not be reused for real patient/staff credentials.
 */
export function verifyDemoPassword(
  password: string,
  storedPasswordHash: string,
): boolean {
  return safeEqualHex(sha256(password), storedPasswordHash);
}
