import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import RefrigeratorTempDashboard from './RefrigeratorTempDashboard';
import RefrigeratorTempReports from './RefrigeratorTempReports';
import ReeferAcReport from './ReeferAcReport';
import LiveReeferStatusReport from './LiveReeferStatusReport';

const tabs = [
  { value: 'dashboard', label: 'Temperature Dashboard' },
  { value: 'reports', label: 'Temp & Humidity Reports' },
  { value: 'ac-report', label: 'Reefer AC Report' },
  { value: 'live-status', label: 'Live Reefer Status' },
];

const RefrigeratorTempPage = ({ activeTab }: { activeTab: string }) => {
  const navigate = useNavigate();
  // Using the exact styling from the Dashboard for tabs
  const triggerStyle = "pb-3 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-orange rounded-none";

  const handleTabChange = (value: string) => {
    navigate(`/addons/refrigerator-temp/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
      <div className="px-6 bg-card border-b shrink-0">
        <div className="flex items-baseline gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">Refrigerator Temp.</h1>
          <TabsList className="bg-transparent p-0 gap-2 h-auto -mb-px">
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className={triggerStyle}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        <TabsContent value="dashboard" className="h-full m-0 p-4 sm:p-6">
          <RefrigeratorTempDashboard />
        </TabsContent>
        <TabsContent value="reports" className="h-full m-0 p-4 sm:p-6">
          <RefrigeratorTempReports />
        </TabsContent>
        <TabsContent value="ac-report" className="h-full m-0 p-4 sm:p-6">
          <ReeferAcReport />
        </TabsContent>
        <TabsContent value="live-status" className="h-full m-0 p-4 sm:p-6">
          <LiveReeferStatusReport />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default RefrigeratorTempPage;