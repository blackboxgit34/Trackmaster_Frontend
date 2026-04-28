import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRightLeft,
  Clock,
  Fuel,
  Gauge,
  Droplets,
  Download,
  ShieldAlert,
} from 'lucide-react';
import ConsolidatedReportContent from './ConsolidatedReportContent';
import { subHours, subDays, subWeeks, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { vehicles, consolidatedReportTableData } from '@/data/mockData';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import MonthlyReportContent from './MonthlyReportContent';
import NotFound from './NotFound';
import ConsolidatedReportTable from './ConsolidatedReportTable';

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  Icon: React.ElementType;
  color: 'blue' | 'cyan' | 'yellow' | 'purple' | 'orange' | 'red';
}

const colorVariants = {
  blue: {
    background: 'bg-blue-100 dark:bg-blue-900/50',
    iconBackground: 'bg-blue-200 dark:bg-blue-800/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  cyan: {
    background: 'bg-cyan-100 dark:bg-cyan-900/50',
    iconBackground: 'bg-cyan-200 dark:bg-cyan-800/50',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  yellow: {
    background: 'bg-yellow-100 dark:bg-yellow-900/50',
    iconBackground: 'bg-yellow-200 dark:bg-yellow-800/50',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  purple: {
    background: 'bg-purple-100 dark:bg-purple-900/50',
    iconBackground: 'bg-purple-200 dark:bg-purple-800/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    background: 'bg-orange-100 dark:bg-orange-900/50',
    iconBackground: 'bg-orange-200 dark:bg-orange-800/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    background: 'bg-red-100 dark:bg-red-900/50',
    iconBackground: 'bg-red-200 dark:bg-red-800/50',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  Icon,
  color,
}) => {
  const variants = colorVariants[color];

  return (
    <Card
      className={cn('rounded-xl border-none shadow-sm', variants.background)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn('p-3 rounded-full', variants.iconBackground)}>
          <Icon className={cn('h-6 w-6', variants.iconColor)} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">
            {value}{' '}
            <span className="text-base font-medium text-muted-foreground">
              {unit}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const timeRanges = [
  { label: 'Last Hour', value: 'last-hour' },
  { label: 'Last Day', value: 'last-day' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 2 Months', value: 'last-2-months' },
];

const ConsolidatedReport = () => {
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  const [date, setDate] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 1),
    to: new Date(),
  });
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(
    'last-week'
  );

  const handleTimeRangeClick = (range: string) => {
    const now = new Date();
    let fromDate: Date;

    switch (range) {
      case 'last-hour':
        fromDate = subHours(now, 1);
        break;
      case 'last-day':
        fromDate = subDays(now, 1);
        break;
      case 'last-week':
        fromDate = subWeeks(now, 1);
        break;
      case 'last-month':
        fromDate = subMonths(now, 1);
        break;
      case 'last-2-months':
        fromDate = subMonths(now, 2);
        break;
      default:
        fromDate = now;
    }

    setDate({ from: fromDate, to: now });
    setActiveTimeRange(range);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setActiveTimeRange(null);
  };

  const selectedTimeRangeLabel =
    timeRanges.find((r) => r.value === activeTimeRange)?.label ||
    'Select a time range';

  const filteredData = useMemo(() => {
    let data = [...consolidatedReportTableData];

    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      data = data.filter(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start, end });
      });
    }

    if (selectedVehicle && selectedVehicle !== 'all') {
      data = data.filter(item => item.machineId === selectedVehicle);
    }
    
    return data;
  }, [date, selectedVehicle]);

  const reportStats = useMemo(() => {
    if (filteredData.length === 0) {
      return [
        { title: 'Total Distance Travelled', value: '0.00', unit: 'kms', Icon: ArrowRightLeft, color: 'blue' },
        { title: 'Total Engine Running Hours', value: '0.00', unit: 'hrs', Icon: Clock, color: 'cyan' },
        { title: 'Total Fuel Consumption', value: '0.00', unit: 'L', Icon: Fuel, color: 'yellow' },
        { title: 'Fuel Efficiency', value: '0.00', unit: 'kmpl', Icon: Gauge, color: 'purple' },
        { title: 'Average Speed', value: '0.00', unit: 'kmph', Icon: Gauge, color: 'orange' },
        { title: 'Total Alerts', value: '0', unit: 'alerts', Icon: ShieldAlert, color: 'red' },
      ] as const;
    }

    const totalWorkingHours = filteredData.reduce((sum, item) => sum + item.workingHours, 0);
    const totalFuelConsumed = filteredData.reduce((sum, item) => sum + item.fuelConsumed, 0);
    const totalAlerts = filteredData.reduce((sum, item) => sum + item.alertsCount, 0);
    
    const averageSpeedKmph = 17.80;
    const totalDistance = totalWorkingHours * averageSpeedKmph;
    const fuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;

    return [
      { title: 'Total Distance Travelled', value: totalDistance.toFixed(2), unit: 'kms', Icon: ArrowRightLeft, color: 'blue' },
      { title: 'Total Engine Running Hours', value: totalWorkingHours.toFixed(2), unit: 'hrs', Icon: Clock, color: 'cyan' },
      { title: 'Total Fuel Consumption', value: totalFuelConsumed.toFixed(2), unit: 'L', Icon: Fuel, color: 'yellow' },
      { title: 'Fuel Efficiency', value: fuelEfficiency.toFixed(2), unit: 'kmpl', Icon: Gauge, color: 'purple' },
      { title: 'Average Speed', value: (totalWorkingHours > 0 ? averageSpeedKmph : 0).toFixed(2), unit: 'kmph', Icon: Gauge, color: 'orange' },
      { title: 'Total Alerts', value: totalAlerts.toString(), unit: 'alerts', Icon: ShieldAlert, color: 'red' },
    ] as const;
  }, [filteredData]);

  const reportTitle = useMemo(() => {
    if (selectedVehicle === 'all') {
      const uniqueVehiclesInFilter = new Set(filteredData.map(d => d.machineId)).size;
      return `Fleet Report for ${uniqueVehiclesInFilter} Vehicle(s)`;
    }
    return `Fleet Report for 1 Selected Vehicle`;
  }, [selectedVehicle, filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
        <div className="flex justify-end items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !activeTimeRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedTimeRangeLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[240px]" align="start">
              {timeRanges.map((range) => (
                <DropdownMenuItem
                  key={range.value}
                  onClick={() => handleTimeRangeClick(range.value)}
                >
                  {range.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DateRangePicker date={date} setDate={handleDateChange} />
          <VehicleCombobox
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={setSelectedVehicle}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <WhatsappPopup />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {reportTitle}
          </h2>
          <p className="text-xs text-muted-foreground">
            {date?.from && date?.to ? `From ${format(date.from, 'dd MMM yyyy')} - To ${format(date.to, 'dd MMM yyyy')}` : 'Date range not selected'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportStats.map((item) => (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              unit={item.unit}
              Icon={item.Icon}
              color={item.color}
            />
          ))}
        </div>
      </div>
      <ConsolidatedReportTable dateRange={date} selectedVehicle={selectedVehicle} />
    </div>
  );
};

const DayWiseReport = () => {
  return <ConsolidatedReportContent />;
};

const MonthlyReport = () => {
  return (
    <div className="space-y-4">
      <MonthlyReportContent />
    </div>
  );
};

const tabs = [
  { value: 'consolidatedreport', label: 'Consolidated Report', component: <ConsolidatedReport /> },
  { value: 'monthlyreport', label: 'Monthly Report', component: <MonthlyReport /> },
  { value: 'daywisereport', label: 'Day wise report', component: <DayWiseReport /> },
];

const Reports = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'consolidatedreport';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/consolidated/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Report
          </h1>
          <TabsList>
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <div className="p-6">
        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.component}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};

export default Reports;