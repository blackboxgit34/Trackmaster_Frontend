import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { vehicleSummary } from '@/data/mockData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettings } from '@/context/SettingsContext';

const CurrentFuelLevel = () => {
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const { fuelThresholds } = useSettings();

  const fuelCounts = useMemo(() => {
    const counts = {
      normal: 0,
      low: 0,
    };

    vehicleSummary.forEach((vehicle) => {
      if (vehicle.fuelLiters < fuelThresholds.low) {
        counts.low += 1;
      } else {
        counts.normal += 1;
      }
    });

    return counts;
  }, [fuelThresholds.low]);

  const chartData = useMemo(
    () => [
      { name: `Normal Fuel (>=${fuelThresholds.low}L)`, shortName: 'Normal Fuel', value: fuelCounts.normal, color: '#22c55e', slug: 'normal' },
      { name: `Low Fuel (<${fuelThresholds.low}L)`, shortName: 'Low Fuel', value: fuelCounts.low, color: '#ef4444', slug: 'low' },
    ],
    [fuelCounts, fuelThresholds.low]
  );

  const totalVehicles = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);

  const activeEntry = useMemo(
    () => (activeLevel ? chartData.find((d) => d.name === activeLevel) : null),
    [activeLevel, chartData]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Current Fuel Level</CardTitle>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                      <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Distribution of vehicles by current fuel level.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center p-4 pt-2">
        <div className="w-full grid grid-cols-1 gap-4 items-center">
          <div className="relative w-full h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="80%"
                  outerRadius="100%"
                  paddingAngle={0}
                  stroke="none"
                  onMouseEnter={(data) => setActiveLevel(data.name)}
                  onMouseLeave={() => setActiveLevel(null)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.color}
                      fillOpacity={activeLevel ? (entry.name === activeLevel ? 1 : 0.3) : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {activeEntry ? (
                <>
                  <span className="text-3xl font-bold tracking-tighter">{activeEntry.value.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground px-2">{activeEntry.shortName}</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold tracking-tighter">{totalVehicles.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {chartData.map((entry) => {
              const percentage = totalVehicles > 0 ? ((entry.value / totalVehicles) * 100).toFixed(0) : 0;
              return (
                <Link
                  key={entry.name}
                  to={`/reports/vehicle/current-fuel?level=${entry.slug}`}
                  className="flex items-center justify-between text-sm cursor-pointer transition-opacity duration-200"
                  onMouseEnter={() => setActiveLevel(entry.name)}
                  onMouseLeave={() => setActiveLevel(null)}
                  style={{ opacity: activeLevel ? (entry.name === activeLevel ? 1 : 0.5) : 1 }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                  </div>
                  <div className="font-semibold text-foreground text-right flex items-baseline gap-2">
                    <span>{entry.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-8 text-left">{percentage}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentFuelLevel;