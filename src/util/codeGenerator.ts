import { randomBytes } from 'crypto';

const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const codeLength = 16;

export function generateRandomCode(): string {
  return Array.from(randomBytes(codeLength))
    .map(byte => charset[byte % charset.length])
    .join('');
}

export async function generateUniqueVoucherCode(offensiveWords: Set<string>, checkCodeExists: (code: string) => Promise<boolean>): Promise<string> {
  let code: string;
  let codeExists: boolean;

  do {
    code = generateRandomCode();
    codeExists = await checkCodeExists(code);
  } while (offensiveWords.has(code) || codeExists);

  return code;
}
