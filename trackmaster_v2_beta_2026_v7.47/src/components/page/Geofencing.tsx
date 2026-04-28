import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ManageFenceTable from './ManageFenceTable';
import CreateFence from './CreateFence';
import ViewFence from './ViewFence';
import GeofenceViolations from './GeofenceViolations';
import AddPoi from './AddPoi';
import ManagePoi from './ManagePoi';
import NotFound from './NotFound';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { useState } from 'react';
import { geofenceMapData, type GeofenceShape } from '@/data/geofenceMapData';
import { usePois } from '@/context/PoiContext';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const Geofencing = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();
  const [fences, setFences] = useState<GeofenceShape[]>(geofenceMapData);
  const { pois, addPoi, updatePois } = usePois();

  const addFence = (newFence: GeofenceShape) => {
    setFences(prevFences => [...prevFences, newFence]);
  };

  const updateFences = (updatedFences: GeofenceShape[]) => {
    setFences(updatedFences);
  };

  const tabs = [
    { value: 'manage', label: 'Manage Fence', component: <ManageFenceTable fences={fences} onUpdateFences={updateFences} />, isMapLayout: false },
    { value: 'create', label: 'Create Fence', component: <CreateFence onAddFence={addFence} />, isMapLayout: true },
    { value: 'view', label: 'View Fence', component: <ViewFence fences={fences} onUpdateFences={updateFences} />, isMapLayout: true },
    { value: 'violations', label: 'Geofence Violations', component: <GeofenceViolations />, isMapLayout: false },
    { value: 'add-poi', label: 'Create POI', component: <AddPoi onAddPoi={addPoi} />, isMapLayout: true },
    { value: 'manage-poi', label: 'Manage POI', component: <ManagePoi pois={pois} onUpdatePois={updatePois} />, isMapLayout: false },
  ];

  const activeTab = subpage || 'manage';

  const isValidSubpage = tabs.some((tab) => tab.value === activeTab);
  if (!isValidSubpage) {
    return <NotFound />;
  }

  const handleTabChange = (value: string) => {
    navigate(`/geofencing/${value}`);
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full flex flex-col h-full"
      >
        <div className="px-6 bg-card border-b shrink-0">
          <div className="flex items-baseline gap-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
              Geofencing
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
            <TabsContent key={tab.value} value={tab.value} className="h-full relative">
              {tab.isMapLayout ? (
                <div className="absolute inset-0 p-6">
                  {tab.component}
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-6">{tab.component}</div>
                </ScrollArea>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </LoadScript>
  );
};

export default Geofencing;