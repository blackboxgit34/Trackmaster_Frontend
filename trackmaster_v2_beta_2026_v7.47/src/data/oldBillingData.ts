export interface OldBill {
  id: string;
  billNo: string;
  billingCycle: string;
  devices: number;
  previousBalance: number;
  totalSubscription: number;
  payableAmt: number;
  balance: number;
}

export const oldBillingData: OldBill[] = [
  {
    id: '1',
    billNo: 'BB22CHDECB15832',
    billingCycle: '01/12/2024 - 31/12/2024',
    devices: 2,
    previousBalance: 0.0,
    totalSubscription: 1200.0,
    payableAmt: 1200.0,
    balance: 0.0,
  },
  {
    id: '2',
    billNo: 'BB22CHNOVB14987',
    billingCycle: '01/11/2024 - 30/11/2024',
    devices: 2,
    previousBalance: 0.0,
    totalSubscription: 1200.0,
    payableAmt: 1200.0,
    balance: 0.0,
  },
  {
    id: '3',
    billNo: 'BB22CHOCTB14123',
    billingCycle: '01/10/2024 - 31/10/2024',
    devices: 1,
    previousBalance: 50.0,
    totalSubscription: 600.0,
    payableAmt: 650.0,
    balance: 0.0,
  },
  {
    id: '4',
    billNo: 'BB22CHSEPB13256',
    billingCycle: '01/09/2024 - 30/09/2024',
    devices: 1,
    previousBalance: 0.0,
    totalSubscription: 600.0,
    payableAmt: 600.0,
    balance: 0.0,
  },
];
