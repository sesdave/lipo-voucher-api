export function parseRequestBody(event: any): any {
    return JSON.parse(event.body || '{}');
}
  
export function validateVoucherData(value: any, expiryDate: any): boolean {
    return value && expiryDate;
}
  