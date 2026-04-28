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
import { PlusCircle, Trash2 } from 'lucide-react';
import WhatsappIcon from './icons/WhatsappIcon';

interface SubscribedNumber {
  id: number;
  countryCode: string;
  number: string;
  duration: string;
}

const countryCodes = [
  { code: 'IN', label: 'India', value: '+91' },
  { code: 'US', label: 'USA', value: '+1' },
  { code: 'GB', label: 'UK', value: '+44' },
  { code: 'AU', label: 'Australia', value: '+61' },
  { code: 'AE', label: 'UAE', value: '+971' },
];

const WhatsappPopup = () => {
  const [subscribed, setSubscribed] = useState(false);
  const [numbers, setNumbers] = useState<SubscribedNumber[]>([
    { id: 1, countryCode: '+91', number: '', duration: '30' },
  ]);

  const addNumber = () => {
    if (numbers.length < 5) {
      setNumbers([
        ...numbers,
        {
          id: Date.now(),
          countryCode: '+91',
          number: '',
          duration: '30',
        },
      ]);
    }
  };

  const removeNumber = (id: number) => {
    setNumbers(numbers.filter((num) => num.id !== id));
  };

  const handleNumberChange = (
    id: number,
    field: 'number' | 'countryCode',
    value: string
  ) => {
    setNumbers(
      numbers.map((num) => (num.id === id ? { ...num, [field]: value } : num))
    );
  };

  const handleDurationChange = (id: number, value: string) => {
    setNumbers(
      numbers.map((num) => (num.id === id ? { ...num, duration: value } : num))
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <WhatsappIcon className="h-10 w-10" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Manage WhatsApp Subscription
          </DialogTitle>
          <DialogDescription>
            You can add up to 5 WhatsApp numbers to receive report
            notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              Subscribed Numbers
            </h3>
            <div className="space-y-3">
              {numbers.map((num) => {
                const selectedCountry = countryCodes.find(
                  (c) => c.value === num.countryCode
                );
                return (
                  <div key={num.id} className="flex items-center gap-2">
                    <Select
                      value={num.countryCode}
                      onValueChange={(value) =>
                        handleNumberChange(num.id, 'countryCode', value)
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        {selectedCountry ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                              alt={selectedCountry.label}
                              className="h-4 w-6 rounded-sm object-contain"
                            />
                            <span>{selectedCountry.label}</span>
                            <span className="text-muted-foreground">
                              {selectedCountry.value}
                            </span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select a country" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem
                            key={country.value}
                            value={country.value}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                alt={country.label}
                                className="h-4 w-6 rounded-sm object-contain"
                              />
                              <span>{country.label}</span>
                              <span className="text-muted-foreground">
                                {country.value}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="tel"
                      value={num.number}
                      onChange={(e) =>
                        handleNumberChange(num.id, 'number', e.target.value)
                      }
                      className="flex-1"
                      placeholder="Enter Whatsapp Number"
                    />
                    <Select
                      value={num.duration}
                      onValueChange={(value) =>
                        handleDurationChange(num.id, value)
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNumber(num.id)}
                      disabled={numbers.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-brand-blue"
            onClick={addNumber}
            disabled={numbers.length >= 5}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add another number
          </Button>
        </div>
        <DialogFooter className="sm:justify-between border-t pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="subscription-status"
              checked={subscribed}
              onCheckedChange={setSubscribed}
              className="data-[state=checked]:bg-brand-blue"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="subscription-status"
                className="text-sm font-medium"
              >
                Subscription:{' '}
                <span
                  className={
                    subscribed ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {subscribed ? 'Subscribed' : 'Unsubscribed'}
                </span>
              </label>
              <p className="text-sm text-muted-foreground">
                Toggle to subscribe/unsubscribe.
              </p>
            </div>
          </div>
          <Button type="submit" className="bg-brand-blue text-white hover:bg-brand-blue/90">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsappPopup;