import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/config/Api';

type Props = {
  data: {
    os: number;
    nonOS: number;
  };
};

const SpeedAnalysis = ({ data: initialData }: Props) => {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  
  const [data, setData] = useState({
    os: initialData?.os || 0,
    nonOS: initialData?.nonOS || 0,
  });

  // ✅ loading
  const [loading, setLoading] = useState(false);

  // ✅ prevents initial API call
  const [hasFilterChanged, setHasFilterChanged] = useState(false);

  // ✅ date range
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // ✅ filter change handler
  const handleFilterChange = (filter: string) => {
    const today = new Date();

    const formatDateTime = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    };

    let startDate = '';
    let endDate = '';

    
    if (filter === 'today') {
      const start = new Date(today);
      start.setDate(today.getDate() - 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(today);
      end.setDate(today.getDate() - 1);
      end.setHours(23, 59, 59, 999);

      startDate = formatDateTime(start);
      endDate = formatDateTime(end);
    }

   
    else if (filter === 'last7days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      startDate = formatDateTime(start);
      endDate = formatDateTime(end);
    }

   
    setHasFilterChanged(true);

    setDateRange({
      startDate,
      endDate,
    });
  };

  
  useEffect(() => {
    // ✅ skip first render
    if (!hasFilterChanged) return;

    const fetchSpeedAnalysis = async () => {
      try {
        setLoading(true);

        const auth = JSON.parse(
          localStorage.getItem('trackmaster-auth') || '{}'
        );

        const custId = auth.custId;
        const type = 'speedanalysis';

        const url =
          `${API_BASE_URL}/Dashboard/dashboarddata?userid=${custId}` +
          `&type=${type}` +
          `&start=${dateRange.startDate}` +
          `&end=${dateRange.endDate}`;

        const res = await fetch(url);
        const result = await res.json();

        if (result.isSuccess) {
          setData({
            os: result.speedAnalysis.os || 0,
            nonOS: result.speedAnalysis.nonOS || 0,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpeedAnalysis();
  }, [dateRange, hasFilterChanged]);

  // ✅ chart data
  const speedData = useMemo(() => {
    return [
      {
        name: 'Normal Speed',
        value: data.nonOS || 0,
        color: '#22c55e',
      },
      {
        name: 'Overspeed',
        value: data.os || 0,
        color: '#ef4444',
      },
    ];
  }, [data]);

  // ✅ total
  const totalMoving = useMemo(
    () => speedData.reduce((acc, curr) => acc + curr.value, 0),
    [speedData]
  );

  // ✅ active hover item
  const activeEntry = useMemo(
    () =>
      activeStatus
        ? speedData.find((d) => d.name === activeStatus)
        : null,
    [activeStatus, speedData]
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Speed Analysis</CardTitle>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button className="p-0 m-0 h-4 w-4 flex items-center justify-center cursor-default">
                      <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Normal vs. Overspeed vehicles.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="text-xs">Normal vs. Overspeed vehicles</CardDescription>
          </div>
         
          <Select
            defaultValue="today"
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              {/* <SelectItem value="yesterday">Yesterday</SelectItem> */}
              <SelectItem value="last7days">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center p-4 pt-2 relative">
        {/* ✅ Loader Overlay */}
  {loading && (
    <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-b-xl">
      <div className="flex items-center gap-2">
        <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )}
        <div className="w-full grid grid-cols-2 gap-4 items-center">
          <div className="relative w-full h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={speedData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="80%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={0}
                  stroke="none"
                  onMouseEnter={(data) => setActiveStatus(data.name)}
                  onMouseLeave={() => setActiveStatus(null)}
                >
                  {speedData.map((entry) => (
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
                  <span className="text-3xl font-bold tracking-tighter">{totalMoving}</span>
                  <span className="text-sm text-muted-foreground">Total Moving</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {speedData.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between text-sm cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setActiveStatus(entry.name)}
                onMouseLeave={() => setActiveStatus(null)}
                style={{ opacity: activeStatus ? (entry.name === activeStatus ? 1 : 0.5) : 1 }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <div className="font-semibold text-foreground text-right">
                  {entry.name === 'Normal Speed' ? (
                    <>
                       <span className="text-xs text-muted-foreground">{data.nonOS} </span> {totalMoving ? (((data.nonOS || 0) / totalMoving) * 100).toFixed(1) : 0 } %
                    </>
                  ) : (
                    <>
                       <span className="text-xs text-muted-foreground">{data.os} </span> {totalMoving ? (((data.os || 0) / totalMoving) * 100).toFixed(1) : 0 } %
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeedAnalysis;