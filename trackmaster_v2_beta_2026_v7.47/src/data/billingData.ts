export interface Bill {
  id: string;
  billNo: string;
  billingCycle: string;
  devices: number;
  previousBalance: number;
  totalSubscription: number;
  payableAmt: number;
  balance: number;
}

export const billingData: Bill[] = [
  {
    id: '1',
    billNo: 'BB23CHAUGBS25237',
    billingCycle: '01/08/2025 - 31/08/2025',
    devices: 3,
    previousBalance: 0.0,
    totalSubscription: 0.0,
    payableAmt: 0.0,
    balance: 0.0,
  },
  {
    id: '2',
    billNo: 'BB23CHAUJL24240',
    billingCycle: '01/07/2025 - 31/07/2025',
    devices: 3,
    previousBalance: 0.0,
    totalSubscription: 0.0,
    payableAmt: 0.0,
    balance: 0.0,
  },
  {
    id: '3',
    billNo: 'BB23CHJUNB23493',
    billingCycle: '01/06/2025 - 30/06/2025',
    devices: 2,
    previousBalance: 0.0,
    totalSubscription: 0.0,
    payableAmt: 0.0,
    balance: 0.0,
  },
  {
    id: '4',
    billNo: 'BB23CHMAYB22988',
    billingCycle: '01/05/2025 - 31/05/2025',
    devices: 2,
    previousBalance: 0.0,
    totalSubscription: 0.0,
    payableAmt: 0.0,
    balance: 0.0,
  },
  {
    id: '5',
    billNo: 'BB23CHAPRBB20211',
    billingCycle: '01/04/2025 - 31/03/2026',
    devices: 5,
    previousBalance: 274.32,
    totalSubscription: 1524.0,
    payableAmt: 1524.0,
    balance: 1798.32,
  },
  {
    id: '6',
    billNo: 'BB23CHAPRE20210',
    billingCycle: '01/04/2025 - 30/04/2025',
    devices: 1,
    previousBalance: 12.6,
    totalSubscription: 70.0,
    payableAmt: 70.0,
    balance: 82.6,
  },
  {
    id: '7',
    billNo: 'BB23CHFEB618684',
    billingCycle: '01/02/2025 - 28/02/2025',
    devices: 3,
    previousBalance: 0.0,
    totalSubscription: 0.0,
    payableAmt: 0.0,
    balance: 0.0,
  },
];
