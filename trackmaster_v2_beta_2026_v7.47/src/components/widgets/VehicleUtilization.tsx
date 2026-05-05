import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { vehicleStatusPieData } from '@/data/mockData';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { API_BASE_URL } from '@/config/Api';

const VehicleUtilization = () => {
    const [data, setData] = useState<any>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

useEffect(() => {
  const fetchVehicleUtilization = async () => {
    try {
      const custid = JSON.parse(localStorage.getItem("trackmaster-auth") ?? "{}")?.custId;

      if (!custid) {
        console.error("custid not found");
        return;
      }

      const url = `${API_BASE_URL}/Dashboard/VehicleUtilization?custid=${custid}`;

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      //const data = await response.json();
      
const result = await response.json();
setData(result.data); // set state here if needed
      console.log("API response:", result.data);
      


    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  fetchVehicleUtilization();
}, []); // empty dependency array = run on
  const chartData = useMemo(() => {
  if (!data) return [];

  return [
    {
      name: 'Moving',
      value: data.moving || 0,
      color: '#22c55e',
    },
    {
      name: 'Idle',
      value: data.ignitionON || 0,
      color: '#ef4444',
    },
    {
      name: 'Parked',
      value: data.parked || 0,
       color: '#facc15',
     
    },
  ];
}, [data]);
//const totalVehicles = data?.totalvehicle || 0;
const totalVehicles = data?.totalvehicle || 0;

// ✅ used only for % calculation
const totalForPercentage = useMemo(
  () => chartData.reduce((acc, curr) => acc + curr.value, 0),
  [chartData]
);
  const activeEntry = useMemo(
    () => (activeStatus ? chartData.find((d) => d.name === activeStatus) : null),
    [activeStatus, chartData]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Vehicle Utilization</CardTitle>
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                  <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Moving, idle, and parked breakdown.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">Moving, idle, and parked breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center p-4 pt-2">
        <div className="w-full grid grid-cols-2 gap-4 items-center">
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
                  onMouseEnter={(data) => setActiveStatus(data.name)}
                  onMouseLeave={() => setActiveStatus(null)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.color}
                      fillOpacity={activeStatus ? (entry.name === activeStatus ? 1 : 0.3) : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {activeEntry ? (
                <>
                  <span className="text-3xl font-bold tracking-tighter">{activeEntry.value.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground px-2">{activeEntry.name}</span>
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
              const percentage = totalForPercentage > 0 ? ((entry.value / totalForPercentage) * 100).toFixed(1) : 0;
              return (
                <Link
                  key={entry.name}
                  to={`/vehicle-status/live?status=${encodeURIComponent(entry.name)}`}
                  className="flex items-center justify-between text-sm cursor-pointer transition-opacity duration-200"
                  onMouseEnter={() => setActiveStatus(entry.name)}
                  onMouseLeave={() => setActiveStatus(null)}
                  style={{ opacity: activeStatus ? (entry.name === activeStatus ? 1 : 0.5) : 1 }}
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

export default VehicleUtilization;