import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text passcode.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, SALT_ROUNDS);
}

/**
 * Compare a plain text passcode with its hash.
 */
export async function comparePasscode(passcode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}
