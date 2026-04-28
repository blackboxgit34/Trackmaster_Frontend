import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, ArrowDownToLine, ExternalLink } from 'lucide-react';
import PaymentCard, { type CardDetails } from './PaymentCard';
import AddPaymentMethodDialog from './AddPaymentMethodDialog';

const billingHistory = [
  {
    id: 1,
    transactionId: '#763ty4902',
    description: 'Service Fee - Fixed Price - Ref ID 217817711',
    date: '01/12/2021 - 01:30:31 PM',
    status: 'Complete',
    amount: '$99.97',
  },
  {
    id: 2,
    transactionId: '#763ty4905',
    description: 'Invoice for UI/UX Design: Milestone 3 - Additional Pages',
    date: '09/12/2021 - 01:40:31 PM',
    status: 'Failed',
    amount: '$2000',
  },
  {
    id: 3,
    transactionId: '#763ty4906',
    description: 'Fees for Freelancer Plus membership',
    date: '14/12/2021 - 05:31:01 AM',
    status: 'On hold',
    amount: '$150',
  },
  {
    id: 4,
    transactionId: '#763ty4909',
    description: 'Payment for monthly installment',
    date: '19/12/2021 - 01:52:31 AM',
    status: 'Pending',
    amount: '$400',
  },
  {
    id: 5,
    transactionId: '#763ty4916',
    description: 'Service Fee - Fixed Price - Ref ID 217817711',
    date: '27/12/2021 - 07:39:11 PM',
    status: 'Pending',
    amount: '$99.97',
  },
  {
    id: 6,
    transactionId: '#763ty4920',
    description: 'Withdrawal Fee - Payoneer',
    date: '31/12/2021 - 03:03:59 PM',
    status: 'Complete',
    amount: '$1000',
  },
  {
    id: 7,
    transactionId: '#763ty4936',
    description: 'Invoice for UI/UX Design: Milestone 3 - Additional Pages',
    date: '01/01/2022 - 04:00:01 PM',
    status: 'Pending',
    amount: '$180',
  },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'complete':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'on hold':
      return 'secondary';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const initialCards: CardDetails[] = [
  {
    id: 'card-1',
    number: '1234567890120329',
    name: 'Elise Beverley',
    expiry: '09/22',
    brand: 'Mastercard',
    status: 'active',
  },
];

const PaymentOptions = () => {
  const [paymentMethods, setPaymentMethods] = useState<CardDetails[]>(initialCards);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddCard = (newCard: Omit<CardDetails, 'id' | 'brand'>) => {
    const cardToAdd: CardDetails = {
      ...newCard,
      id: `card-${Date.now()}`,
      brand: 'Mastercard', // For now, default to Mastercard
    };
    setPaymentMethods(prev => [...prev, cardToAdd]);
  };

  const handleRemoveCard = (cardId: string) => {
    setPaymentMethods(prev => prev.filter(card => card.id !== cardId));
  };

  const handleToggleStatus = (cardId: string) => {
    setPaymentMethods(prev =>
      prev.map(card =>
        card.id === cardId
          ? { ...card, status: card.status === 'active' ? 'paused' : 'active' }
          : card
      )
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Payment Method</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map(card => (
            <PaymentCard
              key={card.id}
              card={card}
              onRemove={handleRemoveCard}
              onToggleStatus={handleToggleStatus}
            />
          ))}

          {/* Add Payment Method */}
          <div 
            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/40 hover:border-muted-foreground/40 transition-colors w-full max-w-sm cursor-pointer"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Add Payment Method</p>
          </div>
        </div>
      </div>

      <AddPaymentMethodDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCard={handleAddCard}
      />

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View invoices for all payments made on your goBoost account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Transaction id</TableHead>
                <TableHead>Discription</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Invoice</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="font-semibold text-primary">{item.transactionId}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.amount}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="text-green-500 hover:bg-green-500/10">
                      <ArrowDownToLine className="h-5 w-5" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10">
                      <ExternalLink className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentOptions;