import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountSummaryTable from './AccountSummaryTable';
import OldAccountSummaryTable from './OldAccountSummaryTable';
import BuySms from './BuySms';
import AccountSummaryCustomTable from './AccountSummaryCustomTable';
import PaymentOptions from './PaymentOptions';
import NotFound from './NotFound';
import BuyWhatsapp from './BuyWhatsapp';

const tabs = [
  { value: 'account-summary', label: 'Account Summary', component: <AccountSummaryTable /> },
  { value: 'old-account-summary', label: 'Old Account Summary', component: <OldAccountSummaryTable /> },
  { value: 'payment-options', label: 'Payment Options', component: <PaymentOptions /> },
  { value: 'buy-sms', label: 'Buy SMS', component: <BuySms /> },
  { value: 'buy-whatsapp', label: 'Whatsapp Credits', component: <BuyWhatsapp /> },
  { value: 'account-summary-custom', label: 'Custom Account Summary', component: <AccountSummaryCustomTable /> },
];

const MyBills = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const activeTab = subpage;

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/bills/${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">My Bills</h1>
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

export default MyBills;