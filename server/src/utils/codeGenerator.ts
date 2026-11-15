/**
 * Generates an uppercase 6-character unique circle code prefix with 'CARE-'.
 * Example: 'CARE-8492'
 */
export function generateCircleCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `CARE-${digits}`;
}

/**
 * Generates a 6-character alphanumeric or numeric passcode.
 */
export function generatePasscode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
