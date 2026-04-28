import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotFound from '@/components/page/NotFound';
import DailySummaryReport from '@/components/page/DailySummaryReport';
import MonthlySummaryReport from '@/components/page/MonthlySummaryReport';
import MonthlyDayWiseDistanceReport from '@/components/page/MonthlyDayWiseDistanceReport';

const tabs = [
  { value: 'daily-summary', label: 'Daily Summary Report', component: <DailySummaryReport /> },
  { value: 'monthly-summary', label: 'Monthly Summary Report', component: <MonthlySummaryReport /> },
  { value: 'monthly-day-wise', label: 'Monthly Day-Wise Distance Report', component: <MonthlyDayWiseDistanceReport /> },
];

const SummaryManagementReportsPage = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'daily-summary';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/summary-management/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Summary & Management Reports
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

export default SummaryManagementReportsPage;