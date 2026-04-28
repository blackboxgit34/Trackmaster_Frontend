import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, Printer, Milestone, Clock, Ban, Hourglass } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { VehicleCombobox } from '@/components/VehicleCombobox';
import { actualVehicles } from '@/data/mockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PlaybackStatCard from './PlaybackStatCard';
import type { TripPoint } from '@/data/routeData';

interface PlaybackSidebarProps {
  selectedVehicle: string | null;
  onVehicleChange: (vehicleId: string) => void;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  vehicleName: string;
  totalDistance: number;
  drivingTime: number; // in minutes
  totalStoppageTime: number; // in minutes
  totalIdling: number; // in minutes
  path: TripPoint[];
}

const formatDuration = (minutes: number) => {
  if (isNaN(minutes) || minutes < 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
};

const TimelineEvent = ({ type, location, time, speed, distance }: { type: 'start' | 'stop' | 'end'; location: string; time: string; speed?: number; distance?: number }) => {
  const icons = {
    start: <div className="h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-card ring-1 ring-green-500" />,
    stop: <div className="h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-card ring-1 ring-blue-500" />,
    end: <div className="h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-card ring-1 ring-red-500" />,
  };

  return (
    <div className="relative pl-8">
      <div className="absolute left-[7px] top-3 -translate-x-1/2">{icons[type]}</div>
      <div className="relative">
        <div className="flex justify-between items-baseline">
          <p className="font-semibold text-sm">{type === 'start' ? 'Start Location' : type === 'end' ? 'End Location' : location}</p>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground">{type !== 'start' && type !== 'end' ? `${distance?.toFixed(1)} Km from Anantapur` : location}</p>
        {speed !== undefined && <p className="text-xs text-muted-foreground">@ {speed}kmph</p>}
      </div>
    </div>
  );
};

const PlaybackSidebar = ({
  selectedVehicle,
  onVehicleChange,
  selectedDate,
  onDateChange,
  vehicleName,
  totalDistance,
  drivingTime,
  totalStoppageTime,
  totalIdling,
  path,
}: PlaybackSidebarProps) => {
  const vehiclesForFilter = actualVehicles.map(v => ({ id: v.id, name: v.name }));

  const { startEvent, intermediateEvents, endEvent } = useMemo(() => {
    if (path.length === 0) return { startEvent: null, intermediateEvents: [], endEvent: null };
    
    const events = [];
    // Start
    events.push({
      type: 'start' as const,
      location: path[0].location || 'Start Point',
      time: format(new Date(path[0].timestamp), 'p'),
    });

    // Intermediate stops
    let stopStart: TripPoint | null = null;
    for (let i = 1; i < path.length; i++) {
      if (path[i].speed === 0 && path[i-1].speed > 0) {
        stopStart = path[i];
      }
      if (path[i].speed > 0 && stopStart) {
        const stopDuration = (new Date(path[i-1].timestamp).getTime() - new Date(stopStart.timestamp).getTime()) / 1000 / 60;
        if (stopDuration > 1) { // Only show stops longer than 1 minute
          events.push({
            type: 'stop' as const,
            location: stopStart.location || 'Stop',
            time: format(new Date(stopStart.timestamp), 'p'),
            speed: path[i-1].speed,
            distance: (path[i-1] as any).distance,
          });
        }
        stopStart = null;
      }
    }

    // End
    if (path.length > 1) {
      events.push({
        type: 'end' as const,
        location: path[path.length - 1].location || 'End Point',
        time: format(new Date(path[path.length - 1].timestamp), 'p'),
      });
    }
    
    if (events.length < 2) {
        return { startEvent: events[0] || null, intermediateEvents: [], endEvent: null };
    }

    return {
      startEvent: events[0],
      intermediateEvents: events.slice(1, -1),
      endEvent: events[events.length - 1]
    };
  }, [path]);

  return (
    <div className="w-[350px] flex-shrink-0 bg-card border-r flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <VehicleCombobox vehicles={vehiclesForFilter} value={selectedVehicle || ''} onChange={onVehicleChange} className="w-full h-9" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Select Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={onDateChange} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold">ROUTE PLAYBACK</p>
          <h2 className="text-lg font-bold">{vehicleName}</h2>
        </div>
      </div>

      <div className="p-2 grid grid-cols-2 gap-2 border-b shrink-0">
        <PlaybackStatCard Icon={Milestone} title="DISTANCE COVERED" value={totalDistance.toFixed(2)} unit="km" iconColorClass="text-blue-500" />
        <PlaybackStatCard Icon={Ban} title="STOPPAGE TIME" value={formatDuration(totalStoppageTime)} unit="" iconColorClass="text-red-500" />
        <PlaybackStatCard Icon={Clock} title="DRIVING TIME" value={formatDuration(drivingTime)} unit="" iconColorClass="text-orange-500" />
        <PlaybackStatCard Icon={Hourglass} title="IDLING TIME" value={formatDuration(totalIdling)} unit="" iconColorClass="text-purple-500" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-3">
        <div className="relative flex flex-col h-full">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
          
          {startEvent && (
            <div className="pb-4 shrink-0">
              <TimelineEvent {...startEvent} />
            </div>
          )}
          
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {intermediateEvents.map((event, index) => (
                <TimelineEvent key={index} {...event} />
              ))}
            </div>
          </ScrollArea>

          {endEvent && (
            <div className="pt-4 shrink-0">
              <TimelineEvent {...endEvent} />
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t grid grid-cols-2 gap-2 shrink-0">
        <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Print</Button>
        <Button className="bg-brand-orange hover:bg-brand-orange/90"><Download className="h-4 w-4 mr-2" /> Export Excel</Button>
      </div>
    </div>
  );
};

export default PlaybackSidebar;