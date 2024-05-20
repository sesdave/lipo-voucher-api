import { DynamoDB, SSM } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ssm = new SSM();

export async function getOffensiveWords(paramPath: string): Promise<Set<string>> {
  try {
    const params = {
      Name: paramPath,
      WithDecryption: true,
    };
    const { Parameter } = await ssm.getParameter(params).promise();

    if (Parameter && Parameter.Value) {
      return new Set(Parameter.Value.split(','));
    }
    return new Set();
  } catch (error) {
    console.error('Error retrieving offensive words:', error);
    throw new Error('Failed to retrieve offensive words');
  }
}

export async function checkCodeExists(tableName: string, code: string): Promise<boolean> {
  const checkParams = {
    TableName: tableName,
    Key: { code },
  };
  const result = await dynamoDb.get(checkParams).promise();
  return !!result.Item;
}

export async function storeVoucher(tableName: string, voucher: any): Promise<void> {
  const params = {
    TableName: tableName,
    Item: voucher,
  };
  await dynamoDb.put(params).promise();
}
