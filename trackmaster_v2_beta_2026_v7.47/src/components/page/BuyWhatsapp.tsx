import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, ArrowUp, Check } from 'lucide-react';
import WhatsappIcon from '../icons/WhatsappIcon';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500,
    description: 'Great for small-scale notifications and alerts.',
    features: ['2,500 credits', 'Standard delivery', 'Basic support'],
    popular: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 950,
    description: 'Ideal for growing businesses and marketing campaigns.',
    features: ['5,000 credits', 'Faster delivery', 'Priority support'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1800,
    description: 'For large-scale operations and customer engagement.',
    features: [
      '10,000 credits',
      'Highest delivery speed',
      'Advanced analytics',
      'Dedicated support',
    ],
    popular: false,
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 3500,
    description: 'Tailored for high-volume and specific needs.',
    features: [
      '20,000 credits',
      'Dedicated infrastructure',
      'Custom integration',
      '24/7 dedicated support',
    ],
    popular: false,
  },
];

const BuyWhatsapp = () => {
  const [selectedPlan, setSelectedPlan] = useState('business');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <WhatsappIcon className="h-7 w-7 text-foreground" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">WhatsApp Account</h2>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg text-foreground">WhatsApp Credits</h3>
            <p className="text-sm text-muted-foreground">
              Your current balance and consumption.
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">1,250</p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <ArrowUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">3,750</p>
                <p className="text-sm text-muted-foreground">Consumed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={cn(
              'flex flex-col p-6 relative transition-all duration-300 cursor-pointer rounded-xl hover:shadow-2xl hover:-translate-y-2',
              plan.popular
                ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-2xl shadow-green-500/40'
                : 'bg-card',
              selectedPlan === plan.id && !plan.popular
                ? 'border-2 border-brand-blue'
                : 'border',
              !plan.popular && 'shadow-md'
            )}
          >
            {plan.popular && (
              <div className="absolute top-0 right-8 bg-white/25 text-white text-sm font-bold px-5 py-1.5 rounded-b-lg">
                Popular
              </div>
            )}
            <div className="flex-grow">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className={cn(
                'text-4xl font-bold my-4',
                plan.popular ? 'text-white' : 'text-brand-blue'
              )}>
                {formatCurrency(plan.price)}
              </p>
              <p className={cn(
                'text-sm mb-6 h-10',
                plan.popular ? 'text-green-100' : 'text-muted-foreground'
              )}>
                {plan.description}
              </p>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className={cn(
                      'h-5 w-5',
                      plan.popular ? 'text-white' : 'text-brand-blue'
                    )} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                'w-full mt-8 font-bold py-3 text-base rounded-lg',
                plan.popular 
                  ? 'bg-white text-brand-blue hover:bg-gray-100' 
                  : selectedPlan === plan.id 
                  ? 'bg-brand-blue text-white hover:bg-brand-blue/90'
                  : 'bg-blue-100/60 dark:bg-blue-900/30 text-brand-blue hover:bg-blue-200/60 dark:hover:bg-blue-900/50'
              )}
            >
              {selectedPlan === plan.id ? 'Selected' : 'Choose Plan'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BuyWhatsapp;