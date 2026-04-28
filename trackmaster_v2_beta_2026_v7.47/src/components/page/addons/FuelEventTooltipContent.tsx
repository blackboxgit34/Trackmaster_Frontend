import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Clock, Fuel, Gauge, Milestone, MapPin, ChevronRight, Droplets, ArrowRightFromLine } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatEventDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const FuelEventTooltipContent = ({ event }: { event: any }) => {
  const { type, amount, beforeLevel, afterLevel, timestamp, location, duration } = event;
  const isFilling = type === 'filling';

  return (
    <div className="grid grid-cols-[130px_1fr] shadow-xl rounded-md overflow-hidden text-xs">
      <div className={cn(
          'text-white flex flex-col items-center justify-center p-3 rounded-l-md',
          isFilling ? 'bg-gradient-to-b from-green-500 to-green-700' : 'bg-gradient-to-b from-red-500 to-red-700'
        )}>
        <div className="text-3xl font-bold">{amount.toFixed(0)}L</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] opacity-95">
          <Fuel className="h-3.5 w-3.5" />
          {isFilling ? 'Fuel Filled' : 'Fuel Theft'}
        </div>
      </div>

      <div className="p-3 bg-card">
        <div className="mb-2">
          <h3 className="font-semibold text-sm">{isFilling ? 'Fuel Filling Details' : 'Fuel Theft Details'}</h3>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(timestamp), "dd-MM-yyyy | hh:mma")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Before:</span>
            <span className="font-semibold">{beforeLevel.toFixed(0)}L</span>
          </div>

          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Speed:</span>
            <span className="font-semibold">{event.speed ?? 0}km/h</span>
          </div>

          <div className="flex items-center gap-2">
            <ArrowRightFromLine className="h-3.5 w-3.5 text-muted-foreground" />
            <span>After:</span>
            <span className="font-semibold">{afterLevel.toFixed(0)}L</span>
          </div>

          {isFilling ? (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Duration:</span>
              <span className="font-semibold">{formatEventDuration(duration)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Milestone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Distance:</span>
              <span className="font-semibold">{(event.distance ?? 0).toFixed(0)}km</span>
            </div>
          )}
        </div>

        <div className="border-t mt-3 pt-2">
          <Link to="#" className="flex items-center justify-between text-sm text-blue-600 hover:underline">
            <div className="flex items-center gap-1 overflow-hidden">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium truncate">{location || 'Location not available'}</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FuelEventTooltipContent;