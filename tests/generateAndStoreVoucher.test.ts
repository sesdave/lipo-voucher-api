import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../src/generateAndStoreVoucher';
import { getOffensiveWords, checkCodeExists, storeVoucher } from '../src/util/awsServices';
import { generateUniqueVoucherCode } from '../src/util/codeGenerator';
import { parseRequestBody, validateVoucherData } from '../src/util/utils';

// Mocking utility functions
jest.mock('../src/util/awsServices', () => ({
  getOffensiveWords: jest.fn(),
  checkCodeExists: jest.fn(),
  storeVoucher: jest.fn(),
}));

jest.mock('../src/util/codeGenerator', () => ({
  generateUniqueVoucherCode: jest.fn(),
}));

jest.mock('../src/util/utils', () => ({
  parseRequestBody: jest.fn(),
  validateVoucherData: jest.fn(),
}));

const mockedGetOffensiveWords = getOffensiveWords as jest.Mock;
const mockedCheckCodeExists = checkCodeExists as jest.Mock;
const mockedStoreVoucher = storeVoucher as jest.Mock;
const mockedGenerateUniqueVoucherCode = generateUniqueVoucherCode as jest.Mock;
const mockedParseRequestBody = parseRequestBody as jest.Mock;
const mockedValidateVoucherData = validateVoucherData as jest.Mock;

describe('GenerateVoucherFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate and store a voucher successfully', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        value: 100,
        expiryDate: '2024-12-31',
      }),
    };

    const parsedRequestBody = { value: 100, expiryDate: '2024-12-31' };
    const generatedVoucherCode = 'UNIQUEVOUCHERCODE';

    mockedParseRequestBody.mockReturnValue(parsedRequestBody);
    mockedValidateVoucherData.mockReturnValue(true);
    mockedGetOffensiveWords.mockResolvedValue(new Set());
    mockedGenerateUniqueVoucherCode.mockResolvedValue(generatedVoucherCode);
    mockedCheckCodeExists.mockResolvedValue(false);
    mockedStoreVoucher.mockResolvedValue(undefined);

    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Voucher generated and stored successfully');
    expect(body).toHaveProperty('voucherCode', generatedVoucherCode);

    expect(mockedParseRequestBody).toHaveBeenCalledWith(event);
    expect(mockedValidateVoucherData).toHaveBeenCalledWith(parsedRequestBody.value, parsedRequestBody.expiryDate);
    expect(mockedGetOffensiveWords).toHaveBeenCalledWith(process.env.OFFENSIVE_WORDS_PARAM_PATH);
    expect(mockedGenerateUniqueVoucherCode).toHaveBeenCalledWith(new Set(), expect.any(Function));
  
    const expectedVoucher = {
      code: generatedVoucherCode,
      value: 100,
      expiryDate: '2024-12-31',
      createdAt: expect.any(String),
      isValid: true,
    };
    expect(mockedStoreVoucher).toHaveBeenCalledWith(process.env.VOUCHER_CODES_TABLE || 'VoucherCodes', expectedVoucher);
  });

  it('should return 400 if value or expiryDate is missing', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({ value: 100 }),
    };

    mockedParseRequestBody.mockReturnValue({ value: 100 });
    mockedValidateVoucherData.mockReturnValue(false);

    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Invalid voucher data: value and expiryDate are required');
  });

  it('should return 500 if there is an internal server error', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        value: 100,
        expiryDate: '2024-12-31',
      }),
    };

    mockedParseRequestBody.mockReturnValue({ value: 100, expiryDate: '2024-12-31' });
    mockedValidateVoucherData.mockReturnValue(true);
    mockedGetOffensiveWords.mockRejectedValue(new Error('SSM error'));

    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Internal Server Error');
  });
});
