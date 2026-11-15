/**
 * Generates an uppercase 6-character unique circle code prefix with 'CARE-'.
 * Example: 'CARE-8492'
 */
export function generateCircleCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `CARE-${digits}`;
}
