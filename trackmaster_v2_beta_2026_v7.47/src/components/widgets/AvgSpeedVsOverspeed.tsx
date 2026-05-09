import { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
// import { vehicles } from '@/data/mockData';
import { VehicleCombobox } from '../VehicleCombobox';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { API_BASE_URL } from '@/config/Api';


type OverSpeedData = {
  overspeedCount: number;
  overCustomCount: number;
  dateTime: string;
};

type Props = {
  data: OverSpeedData[];
};

const chartConfig = {
  avgSpeed: {
    // label: 'Avg. Speed (km/h)',
    label: 'Non Overspeed Incidents',
    color: '#F97316', // Brand Orange
  },
  overspeedIncidents: {
    label: 'Overspeed Incidents',
    color: '#3B82F6', // Brand Blue
  },
} satisfies ChartConfig;

const AvgSpeedVsOverspeed = ({ data }: Props) => {
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [graphData, setGraphData] = useState<OverSpeedData[]>(data || []);
  const [loading, setLoading] = useState(false);
  const custId = JSON.parse(localStorage.getItem("trackmaster-auth") ?? "{}")?.custId;


  const chartData = useMemo(() => {
    if (!graphData) return [];

    return graphData.map((item) => ({
      day: new Date(item.dateTime).toLocaleDateString('en-US', {
        weekday: 'short'
      }),
      overspeedIncidents: item.overspeedCount ?? 0,
      avgSpeed: item.overCustomCount ?? 0
    }));
  }, [graphData]);

  // ===============================
  // 🚗 VEHICLE LIST API
  // ===============================

  useEffect(() => {
    if (!custId) return;
    fetch(`${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`)
      .then(async (res) => {
        const text = await res.text();

        if (!text) {
          console.warn("Empty response");
          return [];
        }

        return JSON.parse(text);
      })
      .then(data => {
        const vehicles = data?.data || [];

        const formatted = [
          { label: 'All', value: 'all' },
          ...vehicles.map((v: any) => ({
            label: v.vehName,
            value: v.bbid
          }))
        ];

        setVehicleList(formatted);
      })
      .catch(err => console.error("API error:", err));
  }, []);


  // ===============================
  // 🚗 Over Speed Graph Data API
  // ===============================

  useEffect(() => {
    if (!custId) return;

    if (selectedVehicle === "all") {
      setGraphData(data);
      return;
    }
    // ✅ START loader
    setLoading(true);

    const url =
      `${API_BASE_URL}/Dashboard/dashboarddata?userid=${custId}&bbid=${selectedVehicle}&type=avgspeedgraph`;

    fetch(url)
      .then(res => res.json())
      .then(result => {
        setGraphData(result.overSpeedReport || []);
      })
      .catch(err => console.error("Graph API error:", err))
      .finally(() => {
        setLoading(false);
      });

  }, [selectedVehicle, custId, data]);


  // if (loading) return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
  //   <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
  //     <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
  //     <span>Please wait...</span>
  //   </div>
  // </div>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Avg. Speed vs. Overspeed</CardTitle>
          <TooltipProvider>
            <UITooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                  <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Daily average speed compared to overspeed incidents.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <VehicleCombobox
          vehicles={vehicleList}
          value={selectedVehicle}
          onChange={setSelectedVehicle}
          className="h-8 text-xs w-[150px]"
        />
      </CardHeader>
      <CardContent className="px-2 flex-1 min-h-[250px] relative" >
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-md">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
              <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
              <span className="text-sm">Please wait ...</span>
            </div>
          </div>
        )}
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                axisLine={false}
                domain={[0, 80]}
                ticks={[0, 20, 40, 60, 80]}
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                label={{ value: 'Speed(km)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                label={{ value: 'No. of Incident', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } }}
              />
              <Tooltip content={<ChartTooltipContent indicator="dot" />} />
              <Legend content={<ChartLegendContent />} verticalAlign="bottom" height={36} />
              <Bar
                dataKey="avgSpeed"
                yAxisId="left"
                fill="var(--color-avgSpeed)"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Line
                dataKey="overspeedIncidents"
                yAxisId="right"
                stroke="var(--color-overspeedIncidents)"
                type="monotone"
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--color-overspeedIncidents)', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};



export default AvgSpeedVsOverspeed;

