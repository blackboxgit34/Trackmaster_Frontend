import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Mail, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscribedEmail {
  id: number;
  email: string;
  frequency: string;
}

const EmailPopup = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(true);
  const [emails, setEmails] = useState<SubscribedEmail[]>([
    { id: 1, email: 'fleet.manager@trackmaster.in', frequency: 'instant' },
  ]);

  const addEmail = () => {
    if (emails.length < 5) {
      setEmails([
        ...emails,
        {
          id: Date.now(),
          email: '',
          frequency: 'instant',
        },
      ]);
    }
  };

  const removeEmail = (id: number) => {
    setEmails(emails.filter((item) => item.id !== id));
  };

  const handleEmailChange = (id: number, value: string) => {
    setEmails(
      emails.map((item) => (item.id === id ? { ...item, email: value } : item))
    );
  };

  const handleFrequencyChange = (id: number, value: string) => {
    setEmails(
      emails.map((item) => (item.id === id ? { ...item, frequency: value } : item))
    );
  };

  const handleSave = () => {
    toast({
      title: 'Email preferences saved',
      description: 'Alert email notification subscriptions updated successfully.',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Manage Email Alert Subscriptions"
        >
          <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
            <Mail className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold">
              Manage Email Alert Subscription
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure up to 5 email recipients to receive automated vehicle alert summaries and immediate breach notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subscribed Email Addresses
            </h3>
            <div className="space-y-2.5">
              {emails.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={item.email}
                    onChange={(e) => handleEmailChange(item.id, e.target.value)}
                    className="flex-1 text-xs h-9"
                    placeholder="Enter email address (e.g. manager@company.com)"
                  />
                  <Select
                    value={item.frequency}
                    onValueChange={(val) => handleFrequencyChange(item.id, val)}
                  >
                    <SelectTrigger className="w-[125px] text-xs h-9">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant" className="text-xs">
                        Instant Alert
                      </SelectItem>
                      <SelectItem value="daily" className="text-xs">
                        Daily Digest
                      </SelectItem>
                      <SelectItem value="weekly" className="text-xs">
                        Weekly Digest
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(item.id)}
                    disabled={emails.length <= 1}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="link"
              className="p-0 h-auto text-xs text-primary font-medium"
              onClick={addEmail}
              disabled={emails.length >= 5}
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Add another email
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-between border-t pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="email-subscription-status"
              checked={subscribed}
              onCheckedChange={setSubscribed}
            />
            <div className="grid gap-0.5 leading-none text-left">
              <label
                htmlFor="email-subscription-status"
                className="text-xs font-semibold cursor-pointer"
              >
                Status:{' '}
                <span className={subscribed ? 'text-emerald-600' : 'text-rose-600'}>
                  {subscribed ? 'Active' : 'Paused'}
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Automated email delivery state.
              </p>
            </div>
          </div>
          <Button type="button" onClick={handleSave} size="sm" className="gap-1 text-xs">
            <Check className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPopup;
