import { DynamoDB, SSM } from 'aws-sdk';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { randomBytes } from 'crypto';
import { Voucher } from './types';

const dynamoDb = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ssm = new SSM();

async function generateVoucherCode(): Promise<string> {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 16;

  try {
      const params = {
          Name: process.env.OFFENSIVE_WORDS_PARAM_PATH!,
          WithDecryption: true
      };
      const { Parameter } = await ssm.getParameter(params).promise();

      let offensiveWords: string[] = [];
      if (Parameter && Parameter.Value) {
          offensiveWords = Parameter.Value.split(',');
      }

      let code: string;

      do {
          code = Array.from(randomBytes(codeLength))
              .map(byte => charset[byte % charset.length])
              .join('');
      } while (offensiveWords.some(word => code.includes(word)));

      return code;
  } catch (error) {
      console.error('Error retrieving offensive words:', error);
      throw error;
  }
}
export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const requestBody = JSON.parse(event.body || '{}');
        const { value, expiryDate } = requestBody;

        if (!value || !expiryDate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid voucher data: value and expiryDate are required' }),
            };
        }

        const voucherCode = await generateVoucherCode();
        const voucher: Voucher = {
            code: voucherCode,
            value,
            expiryDate,
            createdAt: new Date().toISOString(),
            isValid: false
        };

        const params = {
            TableName: process.env.VOUCHER_CODES_TABLE || 'VoucherCodes',
            Item: voucher,
        };

        await dynamoDb.put(params).promise();

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
