import { randomBytes } from 'crypto';

const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const codeLength = 16;
const MAX_ATTEMPTS = 20;

export function generateRandomCode(): string {
  return Array.from(randomBytes(codeLength))
    .map(byte => charset[byte % charset.length])
    .join('');
}

export async function generateUniqueVoucherCode(offensiveWords: Set<string>, checkCodeExists: (code: string) => Promise<boolean>): Promise<string> {
  let code: string;
  let codeExists: boolean;
  let attempt: number = 0;

  do {
    if(attempt >= MAX_ATTEMPTS){
      console.log(`Unable to generate Voucher after 20 attempts`)
      throw new Error("Unable to generate Voucher")
    }
    code = generateRandomCode();
    codeExists = await checkCodeExists(code);
    attempt++
  } while (offensiveWords.has(code) || codeExists);

  return code;
}
