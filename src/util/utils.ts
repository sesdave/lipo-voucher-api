import { isAfter, parseISO } from 'date-fns';

export function parseRequestBody(event: any): any {
    return JSON.parse(event.body || '{}');
}
  
export function validateVoucherData(value: any, expiryDate: any): boolean {
    if (!value) {
        return false;
    }

    const currentDate = new Date();
    const expiry = parseISO(expiryDate);

    if (isNaN(expiry.getTime())) {
        console.log(`Invalid Expiry date - ${expiryDate}`)
        return false;
    }

    return isAfter(expiry, currentDate);
}
  