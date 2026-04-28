import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DistanceReportTable from '@/components/page/DistanceReportTable';
import NotFound from '@/components/page/NotFound';
import MonthlyDayWiseDistanceReport from '@/components/page/MonthlyDayWiseDistanceReport';
import TripReport from '@/components/page/TripReport';

const tabs = [
  { value: 'distance', label: 'Distance Report', component: <DistanceReportTable /> },
  { value: 'trip-report', label: 'Trip Report', component: <TripReport /> },
  { value: 'monthly-day-wise', label: 'Monthly Day-Wise Distance Report', component: <MonthlyDayWiseDistanceReport /> },
];

const TripDistanceReportsPage = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'distance';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/trip-distance/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Trip & Distance Reports
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

export default TripDistanceReportsPage;