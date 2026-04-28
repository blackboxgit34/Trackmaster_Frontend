import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotFound from '@/components/page/NotFound';
import EntryExitReportTable from '@/components/page/EntryExitReportTable';
import ExitEntryReportTable from '@/components/page/ExitEntryReportTable';

const tabs = [
  { value: 'entry-exit-report', label: 'Entry / Exit Report', component: <EntryExitReportTable /> },
  { value: 'exit-entry-report', label: 'Exit / Entry Report', component: <ExitEntryReportTable /> },
];

const LocationZoneReportsPage = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'entry-exit-report';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/location-zone/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Location & Zone Reports
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

export default LocationZoneReportsPage;