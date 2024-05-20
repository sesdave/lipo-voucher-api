import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyHandler } from 'aws-lambda';

const dynamoDb = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler: APIGatewayProxyHandler = async (event) => {
  const code = event.queryStringParameters?.code;
  console.log("Query parameter 'code':", code);

  if (!code) {
    console.error("Voucher code is missing in the request");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Voucher code is required' }),
    };
  }

  const params = {
    TableName: process.env.VOUCHER_CODES_TABLE || 'VoucherCodes',
    Key: { code },
  };

  try {
    console.log("Querying DynamoDB with params:", params);
    const result = await dynamoDb.get(params).promise();
    console.log("DynamoDB response:", result);

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Voucher not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
