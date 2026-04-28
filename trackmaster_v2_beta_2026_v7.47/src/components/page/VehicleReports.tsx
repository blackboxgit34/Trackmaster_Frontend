import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkingHourReportTable from './WorkingHourReportTable';
import EngineTempReportTable from './EngineTempReportTable';
import HydraulicTempReportTable from './HydraulicTempReportTable';
import CurrentFuelLevelReportTable from './CurrentFuelLevelReportTable';
import FuelConsumptionReportTable from './FuelConsumptionReportTable';
import ErrorCodeReportTable from './ErrorCodeReportTable';
import NotFound from './NotFound';

const tabs = [
  { value: 'working-hour', label: 'Working Hour', component: <WorkingHourReportTable /> },
  { value: 'engine-temp', label: 'Engine Temperature', component: <EngineTempReportTable /> },
  { value: 'hydraulic-temp', label: 'Hydraulic Temperature', component: <HydraulicTempReportTable /> },
  { value: 'fuel-consumption', label: 'Fuel Consumption', component: <FuelConsumptionReportTable /> },
  { value: 'current-fuel', label: 'Current Fuel Level', component: <CurrentFuelLevelReportTable /> },
  { value: 'error-code', label: 'Error Code Report', component: <ErrorCodeReportTable /> },
];

const VehicleReports = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'working-hour';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/vehicle/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">Vehicle Reports</h1>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <div className="p-6">
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.component}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};

export default VehicleReports;