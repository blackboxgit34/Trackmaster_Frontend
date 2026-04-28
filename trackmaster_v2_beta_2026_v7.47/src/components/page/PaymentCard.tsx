import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, PauseCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface CardDetails {
  id: string;
  number: string;
  name: string;
  expiry: string;
  brand: 'Mastercard' | 'Visa';
  status: 'active' | 'paused';
}

interface PaymentCardProps {
  card: CardDetails;
  onRemove: (cardId: string) => void;
  onToggleStatus: (cardId: string) => void;
}

const PaymentCard = ({ card, onRemove, onToggleStatus }: PaymentCardProps) => {
  const getCardLogo = (brand: 'Mastercard' | 'Visa') => {
    if (brand === 'Mastercard') {
      return "https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg";
    }
    // In a real app, you'd have a logo for Visa as well.
    return "https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg";
  };

  const formatCardNumber = (number: string) => {
    const lastFour = number.slice(-4);
    return `**** **** **** ${lastFour}`;
  };

  const isPaused = card.status === 'paused';

  return (
    <div className={cn(
      "relative p-6 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg w-full max-w-sm transition-all",
      isPaused && "grayscale opacity-75 from-slate-500 to-slate-600"
    )}>
      <div className="flex justify-between items-start">
        <img src={getCardLogo(card.brand)} alt={card.brand} className="h-8" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 -mt-2 -mr-2">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPaused ? (
              <DropdownMenuItem onClick={() => onToggleStatus(card.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>Activate Card</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onToggleStatus(card.id)}>
                <PauseCircle className="mr-2 h-4 w-4" />
                <span>Pause</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRemove(card.id)} className="text-red-500 focus:text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Remove Card</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-8">
        <p className="text-2xl font-mono tracking-widest">{formatCardNumber(card.number)}</p>
      </div>
      <div className="flex justify-between items-end mt-6">
        <div>
          <p className="text-xs opacity-70">NAME</p>
          <p className="font-medium">{card.name}</p>
        </div>
        <div>
          <p className="text-xs opacity-70">EXPIRY DATE</p>
          <p className="font-medium">{card.expiry}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
