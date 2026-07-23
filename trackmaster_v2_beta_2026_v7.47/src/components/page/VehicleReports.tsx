import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CurrentFuelLevelReportTable from './CurrentFuelLevelReportTable';
import NotFound from './NotFound';

const tabs = [
  { value: 'current-fuel', label: 'Current Fuel Level', component: <CurrentFuelLevelReportTable /> },
];

const VehicleReports = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'current-fuel';

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