import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  CheckCircle2,
  ArrowUp,
  Check,
} from 'lucide-react';

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
    id: 'basic',
    name: 'Basic',
    price: 250,
    description: 'Ideal for getting started with SMS campaigns.',
    features: ['1,000 SMS credits', 'Standard delivery speed', 'Email support'],
    popular: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 480,
    description: 'Perfect for small businesses with growing needs.',
    features: ['2,000 SMS credits', 'Faster delivery speed', 'Priority email support'],
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1100,
    description: 'For established businesses and larger teams.',
    features: [
      '5,000 SMS credits',
      'Highest delivery speed',
      'Advanced analytics',
      'Phone & email support',
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2000,
    description: 'For large organizations with specific needs.',
    features: [
      '10,000 SMS credits',
      'Dedicated infrastructure',
      'Custom integration',
      '24/7 dedicated support',
    ],
    popular: false,
  },
];

const BuySms = () => {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-foreground" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">SMS Account</h2>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg text-foreground">SMS Usage</h3>
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
                <p className="text-xl font-bold text-foreground">513</p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <ArrowUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">823</p>
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
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl shadow-blue-500/40'
                : 'bg-card',
              selectedPlan === plan.id && !plan.popular
                ? 'border-2 border-brand-blue'
                : 'border',
              !plan.popular && plan.id !== 'standard' && 'shadow-md',
              plan.id === 'standard' && 'shadow-lg'
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
                plan.popular ? 'text-blue-100' : 'text-muted-foreground'
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

export default BuySms;