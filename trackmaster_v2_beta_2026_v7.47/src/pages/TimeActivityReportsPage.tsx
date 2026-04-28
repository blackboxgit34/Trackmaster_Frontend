import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotFound from '@/components/page/NotFound';
import StoppageAnalysisTable from '@/components/page/StoppageAnalysisTable';
import IdlingAnalysisTable from '@/components/page/IdlingAnalysisTable';
import IgnitionOnOffAnalysisTable from '@/components/page/IgnitionOnOffAnalysisTable';
import CombinedTripReportTable from '@/components/page/CombinedTripReportTable';

const tabs = [
  { value: 'stoppage-analysis', label: 'Stoppage Analysis', component: <StoppageAnalysisTable /> },
  { value: 'idling-analysis', label: 'Idling Analysis', component: <IdlingAnalysisTable /> },
  { value: 'ignition-on-off-analysis', label: 'Ignition On/Off Analysis', component: <IgnitionOnOffAnalysisTable /> },
  { value: 'combined-trip-report', label: 'Combined Trip Report', component: <CombinedTripReportTable /> },
];

const TimeActivityReportsPage = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'stoppage-analysis';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/time-activity/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Time & Activjkjhkjhity Analysis
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

export default TimeActivityReportsPage;