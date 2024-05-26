import { APIGatewayProxyHandler } from 'aws-lambda';
import { getOffensiveWords, checkCodeExists, storeVoucher } from './util/awsServices';
import { generateUniqueVoucherCode } from './util/codeGenerator';
import { parseRequestBody, validateVoucherData } from './util/utils';
import { Voucher } from './types';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const requestBody = parseRequestBody(event);
    const { value, expiryDate } = requestBody;

    if (!validateVoucherData(value, expiryDate)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid voucher data: value and expiryDate are required' }),
      };
    }
    const offensiveWords = await getOffensiveWords(process.env.OFFENSIVE_WORDS_PARAM_PATH!);
    const voucherCode = await generateUniqueVoucherCode(offensiveWords, async (code) => {
      return checkCodeExists(process.env.VOUCHER_CODES_TABLE || 'VoucherCodes', code);
    });

    const voucher: Voucher = {
      code: voucherCode,
      value,
      expiryDate,
      createdAt: new Date().toISOString(),
      isValid: true,
    };

    await storeVoucher(process.env.VOUCHER_CODES_TABLE || 'VoucherCodes', voucher);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Voucher generated and stored successfully', voucherCode }),
    };
  } catch (error) {
    console.error('Error generating and storing voucher:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
