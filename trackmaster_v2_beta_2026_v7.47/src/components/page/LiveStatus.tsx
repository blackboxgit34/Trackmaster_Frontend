import VehicleStatus from '@/components/widgets/VehicleStatus';
import LiveStatusTable from './LiveStatusTable';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { Skeleton } from '@/components/ui/skeleton';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const LiveStatus = () => {
  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      loadingElement={<Skeleton className="w-full h-full" />}
    >
      <div className="p-6 space-y-6">
        <VehicleStatus />
        <LiveStatusTable />
      </div>
    </LoadScript>
  );
};

export default LiveStatus;