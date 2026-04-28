import { VehicleCombobox } from '@/components/VehicleCombobox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { actualVehicles } from '@/data/mockData';
import { format } from 'date-fns';
import { Clock, Milestone, Fuel, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface FuelPlaybackControlPanelProps {
  selectedVehicle: string | null;
  onVehicleChange: (vehicleId: string) => void;
  selectedDateRange: DateRange | undefined;
  onDateRangeChange: (date: DateRange | undefined) => void;
  summary: {
    totalDistance: number;
    duration: number;
    totalFuelConsumed: number;
    totalFilling: number;
    totalTheft: number;
  } | null;
}

const FuelPlaybackControlPanel = ({
  selectedVehicle,
  onVehicleChange,
  selectedDateRange,
  onDateRangeChange,
  summary,
}: FuelPlaybackControlPanelProps) => {
  const vehiclesForFilter = actualVehicles.map(m => ({ id: m.id, name: m.name }));

  const dateRangeLabel = selectedDateRange?.from
    ? selectedDateRange.to
      ? `${format(selectedDateRange.from, 'MMM dd')} - ${format(selectedDateRange.to, 'MMM dd, yyyy')}`
      : format(selectedDateRange.from, 'MMM dd, yyyy')
    : 'Select Date Range';

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-card border rounded-lg h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Fuel Playback</h2>
        <p className="text-sm text-muted-foreground">Review fuel usage against vehicle activity.</p>
      </div>
      <div className="p-4 space-y-4 border-b">
        <div className="flex items-center gap-2">
          <VehicleCombobox
            vehicles={vehiclesForFilter}
            value={selectedVehicle || ''}
            onChange={onVehicleChange}
            className="w-full flex-1"
          />
          <DateRangePicker date={selectedDateRange} setDate={onDateRangeChange} showIconOnly />
        </div>
      </div>
      <div className="flex-1 p-4">
        {summary ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trip Summary</CardTitle>
              <CardDescription>{dateRangeLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><Milestone className="h-4 w-4" /> Total Distance</span>
                <span className="font-semibold">{summary.totalDistance.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Total Duration</span>
                <span className="font-semibold">{formatDuration(summary.duration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><Fuel className="h-4 w-4" /> Fuel Consumed</span>
                <span className="font-semibold">{summary.totalFuelConsumed.toFixed(1)} L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-green-500" /> Total Filling</span>
                <span className="font-semibold text-green-500">{summary.totalFilling.toFixed(1)} L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-red-500" /> Total Theft</span>
                <span className="font-semibold text-red-500">{summary.totalTheft.toFixed(1)} L</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center p-8 text-sm text-muted-foreground h-full flex items-center justify-center">
            <p>
              {selectedVehicle
                ? 'No trip data found for this vehicle in the selected date range.'
                : 'Please select a vehicle to view its route history.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelPlaybackControlPanel;