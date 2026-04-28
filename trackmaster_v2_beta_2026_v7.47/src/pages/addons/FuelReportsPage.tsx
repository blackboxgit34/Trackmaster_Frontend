import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import FuelFillingReportTable from '@/components/page/addons/FuelFillingReportTable';
import FuelTheftReportTable from '@/components/page/addons/FuelTheftReportTable';
import DisconnectionReportTable from '@/components/page/addons/DisconnectionReportTable';
import DirtErrorReportTable from '@/components/page/addons/DirtErrorReportTable';
import FuelConsolidatedReportTable from '@/components/page/addons/FuelConsolidatedReportTable';
import FuelGraphicalReport from '@/pages/addons/FuelGraphicalReport';
import FuelAnalysisDashboard from './FuelAnalysisDashboard';
import FuelConsumptionPlayback from './FuelConsumptionPlayback';

const tabs = [
  { value: 'fuel-analysis', label: 'Fuel Analysis' },
  { value: 'graphical-report', label: 'Fuel Graphical Report' },
  { value: 'filling-report', label: 'Fuel Filling Report' },
  { value: 'theft-report', label: 'Fuel Theft Report' },
  { value: 'disconnection-report', label: 'Disconnection Report' },
  { value: 'dirt-error-report', label: 'Dirt Error Report' },
  { value: 'consolidated-report', label: 'Consolidated Report' },
  { value: 'consumption-timeline', label: 'Fuel Consumption Playback' },
];

const FuelReportsPage = ({ activeTab }: { activeTab: string }) => {
  const navigate = useNavigate();
  const triggerStyle = "pb-3 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-orange rounded-none";

  const handleTabChange = (value: string) => {
    navigate(`/addons/fuel-reports/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
      <div className="px-6 bg-card border-b shrink-0">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">Fuel Reports</h1>
          <TabsList className="bg-transparent p-0 -mb-px">
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className={triggerStyle}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        <TabsContent value="fuel-analysis" className="p-6">
          <FuelAnalysisDashboard />
        </TabsContent>
        <TabsContent value="graphical-report" className="p-6">
          <FuelGraphicalReport />
        </TabsContent>
        <TabsContent value="consumption-timeline" className="h-full m-0">
          <FuelConsumptionPlayback />
        </TabsContent>
        <TabsContent value="filling-report" className="p-6">
          <FuelFillingReportTable />
        </TabsContent>
        <TabsContent value="theft-report" className="p-6">
          <FuelTheftReportTable />
        </TabsContent>
        <TabsContent value="disconnection-report" className="p-6">
          <DisconnectionReportTable />
        </TabsContent>
        <TabsContent value="dirt-error-report" className="p-6">
          <DirtErrorReportTable />
        </TabsContent>
        <TabsContent value="consolidated-report" className="p-6">
          <FuelConsolidatedReportTable />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default FuelReportsPage;