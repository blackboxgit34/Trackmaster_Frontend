import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { CardDetails } from './PaymentCard';

const formSchema = z.object({
  name: z.string()
    .min(2, { message: "Name must be at least 2 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Please enter a valid name." }),
  number: z.string()
    .regex(/^\d{16}$/, { message: "Card number must be exactly 16 digits." }),
  expiry: z.string()
    .regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, { message: "Use MM/YY format." }),
  cvv: z.string()
    .regex(/^\d{3,4}$/, { message: "CVV must be 3 or 4 digits." }),
}).refine(data => {
    const [month, year] = data.expiry.split('/');
    if (!month || !year) return false;

    const expiryMonth = parseInt(month, 10);
    const expiryYear = parseInt(`20${year}`, 10);
    
    const now = new Date();
    now.setDate(1); 
    now.setHours(0, 0, 0, 0);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (expiryYear < currentYear) return false;
    if (expiryYear === currentYear && expiryMonth < currentMonth) return false;

    return true;
}, {
    message: "Card has expired.",
    path: ["expiry"],
});

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCard: (card: Omit<CardDetails, 'id' | 'brand'>) => void;
}

const AddPaymentMethodDialog = ({ open, onOpenChange, onAddCard }: AddPaymentMethodDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      expiry: "",
      cvv: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddCard({
      name: values.name,
      number: values.number,
      expiry: values.expiry,
      status: 'active',
    });
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a new payment method</DialogTitle>
          <DialogDescription>
            Enter your card details. Your information is secure.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on card</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card number</FormLabel>
                  <FormControl>
                    <Input placeholder="**** **** **** ****" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry date</FormLabel>
                    <FormControl>
                      <Input placeholder="MM/YY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Add Card</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentMethodDialog;
