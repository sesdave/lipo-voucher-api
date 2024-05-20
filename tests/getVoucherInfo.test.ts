import { handler } from '../src/getVoucherInfo';
import AWS from 'aws-sdk';
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

jest.mock('aws-sdk', () => {
  const mockDocumentClient = {
    get: jest.fn().mockImplementation((params) => {
      const records = [
        {
          code: 'VALID_CODE',
          value: 100,
          expiryDate: '2024-12-31',
          createdAt: '2024-01-01T00:00:00.000Z',
          isValid: true,
        },
        {
          code: 'ANOTHER_CODE',
          value: 50,
          expiryDate: '2024-11-30',
          createdAt: '2024-02-01T00:00:00.000Z',
          isValid: false,
        },
      ];
      const record = records.find(record => record.code === params.Key.code);
      return {
        promise: jest.fn().mockResolvedValue(record ? { Item: record } : {}),
      };
    }),
  };
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient),
    },
  };
});

const mockedDynamoDb = new AWS.DynamoDB.DocumentClient();

describe('GetVoucherInfoFunction', () => {
  it('should retrieve voucher info successfully', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      queryStringParameters: { code: 'VALID_CODE' }
    };
    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('code', 'VALID_CODE');
    expect(body).toHaveProperty('value', 100);
    expect(body).toHaveProperty('expiryDate', '2024-12-31');
    expect(body).toHaveProperty('createdAt', '2024-01-01T00:00:00.000Z');
    expect(body).toHaveProperty('isValid', true);
  });

  it('should return 400 if voucher code is not provided', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      queryStringParameters: {}
    };

    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Voucher code is required');
  });

  it('should return 404 if voucher is not found', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      queryStringParameters: { code: 'INVALID_CODE' }
    };

    const result = await handler(event as APIGatewayProxyEvent, {} as Context, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('message', 'Voucher not found');
  });

});
