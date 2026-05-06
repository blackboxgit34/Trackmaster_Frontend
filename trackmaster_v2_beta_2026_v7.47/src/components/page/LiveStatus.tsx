import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/Api';
import VehicleStatus from '@/components/widgets/VehicleStatus';
import LiveStatusTable from './LiveStatusTable';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { Skeleton } from '@/components/ui/skeleton';

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const LiveStatus = () => {
  const [vehicleStatusData, setVehicleStatusData] = useState<any | null>(null);

  useEffect(() => {
    const fetchVehicleStatusData = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
        const custId = auth.custId;

        const url = `${API_BASE_URL}/Dashboard/dashboarddata?userid=${custId}&type=vehiclestatus`;

        const res = await fetch(url);
        const result = await res.json();

        if (result.isSuccess) {
          setVehicleStatusData(result);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchVehicleStatusData();
  }, []);

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      loadingElement={<Skeleton className="w-full h-full" />}
    >
      <div className="p-6 space-y-6">
        <VehicleStatus data={vehicleStatusData?.vehicleStatus} />
        <LiveStatusTable />
      </div>
    </LoadScript>
  );
};

export default LiveStatus;