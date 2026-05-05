import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotFound from '@/components/page/NotFound';
import CrewReportTable from '@/components/page/CrewReportTable';

// =========================
// ✅ FIX: IMPORT OUTLET CONTEXT
// =========================
import { useOutletContext } from "react-router-dom";

type OutletContextType = {
  search: string;
};

const OperationalCrewReportsPage = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();
  // =========================
  // ✅ FIX: GET SEARCH FROM APP LAYOUT
  // =========================
  const { search } = useOutletContext<OutletContextType>();
  const activeTab = subpage || 'crew-report';
  const isValidSubpage = activeTab === 'crew-report';
  if (!isValidSubpage) {
    return <NotFound />;
  }
  const handleTabChange = (value: string) => {
    navigate(`/reports/operational-crew/${value}`);
  };
  // =========================
  // TABS CONFIG
  // =========================
  const tabs = [
    {
      value: 'crew-report',
      label: 'Crew Report',
      component: <CrewReportTable search={search} /> // ✅ SEARCH PASSED HERE
    },
  ];
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Operational & Crew Reports
          </h1>
          <TabsList>
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <div className="p-6">
        {tabs.map(tab => (<TabsContent key={tab.value} value={tab.value}>{tab.component}</TabsContent>))}
      </div>
    </Tabs>
  );
};

export default OperationalCrewReportsPage;