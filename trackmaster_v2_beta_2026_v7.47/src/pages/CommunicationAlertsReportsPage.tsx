import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotFound from '@/components/page/NotFound';
import SmsNotificationReportTable from '@/components/page/SmsNotificationReportTable';

const tabs = [
  { value: 'sms-notification-report', label: 'SMS & Notification Report', component: <SmsNotificationReportTable /> },
];

const CommunicationAlertsReportsPage = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage || 'sms-notification-report';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/reports/communication-alerts/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Communication & Alerts
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

export default CommunicationAlertsReportsPage;