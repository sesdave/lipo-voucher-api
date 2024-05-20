import { DynamoDB } from 'aws-sdk';
import { ScheduledHandler } from 'aws-lambda';
import { Voucher } from './types';

const dynamoDb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.VOUCHER_CODES_TABLE || 'VoucherCodes';

export const handler: ScheduledHandler = async () => {
  const currentDate = new Date().toISOString();
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'expiryDate < :currentDate AND isValid = :isValid',
    ExpressionAttributeValues: {
      ':currentDate': currentDate,
      ':isValid': true,
    },
  };

  try {
    const result = await dynamoDb.scan(params).promise();
    const expiredVouchers = result.Items as Voucher[];

    if (expiredVouchers.length === 0) {
      console.log('No expired vouchers found.');
      return;
    }

    const updatePromises = expiredVouchers.map((voucher) =>
      dynamoDb.update({
        TableName: TABLE_NAME,
        Key: { code: voucher.code },
        UpdateExpression: 'set isValid = :isValid',
        ExpressionAttributeValues: {
          ':isValid': false,
        },
      }).promise()
    );

    await Promise.all(updatePromises);

    console.log(`Marked ${expiredVouchers.length} vouchers as invalid.`);
  } catch (error) {
    console.error('Error updating expired vouchers:', error);
  }
};
