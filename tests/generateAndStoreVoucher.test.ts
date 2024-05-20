import { DynamoDB, SSM } from 'aws-sdk';
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { randomBytes } from 'crypto';
import { handler } from '../src/generateAndStoreVoucher';

jest.mock('aws-sdk', () => {
  const mockDocumentClient = {
    put: jest.fn().mockImplementation(() => ({
      promise: jest.fn(),
    })),
  };
  const mockSSM = {
    getParameter: jest.fn().mockImplementation(() => ({
      promise: jest.fn().mockResolvedValue({ Parameter: { Value: '' } }),
    })),
  };
  return {
    SSM: jest.fn(() => mockSSM),
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient),
    },
  };
});

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

const mockedDynamoDb = new DynamoDB.DocumentClient();
const mockedSSM = new SSM();
const mockedRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;

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

    // Mock randomBytes to return predictable bytes
    mockedRandomBytes.mockImplementation((size: number) => Buffer.from(new Uint8Array(size).fill(65)));
  
    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Voucher generated and stored successfully');
    expect(body).toHaveProperty('voucherCode', '3333333333333333');  // As per the mock

    const params = {
      TableName: process.env.VOUCHER_CODES_TABLE || 'VoucherCodes',
      Item: {
        code: '3333333333333333',
        value: 100,
        expiryDate: '2024-12-31',
        createdAt: expect.any(String),
        isValid: false,
      },
    };

    expect(mockedDynamoDb.put).toHaveBeenCalledWith(params);
  });

  it('should return 400 if value or expiryDate is missing', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({ value: 100 }),
    };

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

    const mockPut = mockedDynamoDb.put as jest.MockedFunction<typeof mockedDynamoDb.put>;
    mockPut.mockReturnValueOnce({
      promise: jest.fn().mockRejectedValue(new Error('DynamoDB error')),
    } as any);

    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Internal Server Error');
  });
});
