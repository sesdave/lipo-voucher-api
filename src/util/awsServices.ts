import { DynamoDB, SSM } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();
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
  try{
    const result = await dynamoDb.get(checkParams).promise();
    return !!result.Item;
  } catch (error) {
    console.error('Error checking if code exists in DynamoDB:', error);
    throw new Error('Error accessing DynamoDB');
  }
}

export async function storeVoucher(tableName: string, voucher: any): Promise<void> {
  const params = {
    TableName: tableName,
    Item: voucher,
  };
  await dynamoDb.put(params).promise();
}
