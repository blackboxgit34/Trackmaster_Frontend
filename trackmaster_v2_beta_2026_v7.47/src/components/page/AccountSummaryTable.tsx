import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { billingData, type Bill } from '@/data/billingData';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return `₹${amount.toFixed(2)}`;
};

const AccountSummaryTable = () => {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="uppercase text-xs">Bill No</TableHead>
            <TableHead className="uppercase text-xs">Billing Cycle</TableHead>
            <TableHead className="uppercase text-xs text-center">No. of Devices</TableHead>
            <TableHead className="uppercase text-xs text-right">Previous Balance</TableHead>
            <TableHead className="uppercase text-xs text-right">Total Subscription</TableHead>
            <TableHead className="uppercase text-xs text-right">Payable Amt</TableHead>
            <TableHead className="uppercase text-xs text-right">Balance (with GST 18%)</TableHead>
            <TableHead className="uppercase text-xs text-center">Billing</TableHead>
            <TableHead className="uppercase text-xs text-center">Pay Online</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {billingData.map((bill: Bill) => (
            <TableRow key={bill.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{bill.billNo}</TableCell>
              <TableCell className="text-muted-foreground">{bill.billingCycle}</TableCell>
              <TableCell className="text-center">{bill.devices}</TableCell>
              <TableCell className="text-right">{formatCurrency(bill.previousBalance)}</TableCell>
              <TableCell className="text-right">{formatCurrency(bill.totalSubscription)}</TableCell>
              <TableCell className="text-right">{formatCurrency(bill.payableAmt)}</TableCell>
              <TableCell
                className={cn(
                  'text-right font-bold',
                  bill.balance > 0 ? 'text-red-500' : 'text-foreground'
                )}
              >
                {formatCurrency(bill.balance)}
              </TableCell>
              <TableCell className="text-center">
                <Button variant="link" className="text-brand-blue dark:text-blue-400 p-0 h-auto">
                  View Bill
                </Button>
              </TableCell>
              <TableCell className="text-center">
                {bill.balance === 0 ? (
                  <span className="text-green-500 font-semibold">Paid</span>
                ) : (
                  <Button
                    size="sm"
                    className={cn(
                      'text-white',
                      bill.balance > 0
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    )}
                  >
                    Pay Now
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AccountSummaryTable;