import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RouteListPage from './trip-management/RouteListPage';
import CreateRoutePage from './trip-management/CreateRoutePage';
import AssignRoutePage from './trip-management/AssignRoutePage';
import TrackEtaPage from './trip-management/TrackEtaPage';
import EtaDashboardPage from './trip-management/EtaDashboardPage';
import TripViolationsPage from './trip-management/TripViolationsPage';
import NotFound from './NotFound';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { Skeleton } from '@/components/ui/skeleton';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const TripManagement = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const tabs = [
    { value: 'eta-dashboard', label: 'ETA Dashboard', component: <EtaDashboardPage />, isMapLayout: false },
    { value: 'track-eta', label: 'Track ETA', component: <TrackEtaPage />, isMapLayout: true },
    { value: 'routes', label: 'Route List', component: <RouteListPage />, isMapLayout: false },
    { value: 'create-route', label: 'Create Route', component: <CreateRoutePage />, isMapLayout: true },
    { value: 'assign', label: 'Assign Route', component: <AssignRoutePage />, isMapLayout: false },
    { value: 'violations', label: 'Trip Violations', component: <TripViolationsPage />, isMapLayout: false },
  ];

  const activeTab = subpage || 'eta-dashboard';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/trip-management/${value}`);
  };

  if (!isLoaded) {
    return (
      <div className="p-6 space-y-6 w-full h-[calc(100vh-8rem)]">
        <Skeleton className="w-full h-12" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <Skeleton className="h-full" />
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full flex flex-col h-full"
    >
      <div className="px-6 bg-card border-b shrink-0">
        <div className="flex items-baseline gap-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
            Trip Management
          </h1>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      <div className="flex-grow overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="h-full relative m-0">
            {tab.isMapLayout ? (
              <div className="absolute inset-0 p-6">
                {tab.component}
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="p-6 max-w-full min-w-0">{tab.component}</div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};

export default TripManagement;
