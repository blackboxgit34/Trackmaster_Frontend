import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LiveVehicleStatus } from '@/types';
import { actualVehicles } from '@/data/mockData';
import { GoogleMap, OverlayView } from '@react-google-maps/api';
import { getIconUrl, getStatusColor } from '@/lib/map-utils';
import { cn } from '@/lib/utils';

interface VehicleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: LiveVehicleStatus | null;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground">{value || '-'}</p>
  </div>
);

const DailyStatusItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <div className="flex justify-between text-sm">
        <p className="text-muted-foreground">{label}:</p>
        <p className="font-semibold text-foreground">{value || 'Not Provided'}</p>
    </div>
);

const containerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
};

const VehicleDetailDialog = ({ open, onOpenChange, vehicle }: VehicleDetailDialogProps) => {
  if (!vehicle) return null;

  const vehicleDetails = actualVehicles.find(m => m.id === vehicle.vehicleNo);
  const position = { lat: vehicle.lat, lng: vehicle.lng };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Left Card */}
          <Card>
            <CardContent className="p-4 flex items-center gap-6">
              <img
                src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400&auto=format&fit=crop"
                alt={vehicle.vehicleNo}
                className="h-40 w-40 object-cover rounded-lg"
              />
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-1">
                <div>
                  <h2 className="text-2xl font-bold">{vehicle.vehicleNo}</h2>
                  <p className="text-sm text-muted-foreground">Vehicle ID: {vehicle.id}</p>
                </div>
                <div/>
                <DetailItem label="Vehicle Type" value={vehicle.type} />
                <DetailItem label="Make" value={vehicleDetails?.make} />
                <DetailItem label="Model" value={vehicle.model} />
                <DetailItem label="Color" value="-" />
                <DetailItem label="Registration No." value={vehicle.vehicleNo} />
                <DetailItem label="Year" value="-" />
                <DetailItem label="Initial Odometer" value={`${vehicleDetails?.odometer.toLocaleString() || 0} km`} />
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <Card className="overflow-hidden">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={position}
              zoom={15}
              options={mapOptions}
            >
              <OverlayView
                position={position}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div style={{
                  position: 'absolute',
                  transform: 'translate(-50%, -50%)',
                  width: '56px',
                  height: '56px',
                }}>
                  <div className={cn("absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple", getStatusColor(vehicle.status))} />
                  <div className={cn("absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full animate-ripple", getStatusColor(vehicle.status))} style={{ animationDelay: '1s' }} />
                  <img
                    src={getIconUrl(vehicle.type, vehicle.status)}
                    alt="vehicle"
                    className="relative z-10 w-full h-full object-contain"
                  />
                </div>
              </OverlayView>
            </GoogleMap>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Detailed Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <DetailItem label="Registration Date" value="-" />
              <DetailItem label="Pollution Expiry" value="-" />
              <DetailItem label="Purchase Date" value="-" />
              <DetailItem label="Price" value="-" />
              <DetailItem label="Insurance Company" value="-" />
              <DetailItem label="Insurance Policy No" value="-" />
              <DetailItem label="Insurance Expiry" value="-" />
              <DetailItem label="RC Renewal Date" value="-" />
              <DetailItem label="Engine No" value="-" />
              <DetailItem label="Chassis No" value="-" />
              <DetailItem label="Device ID" value="CMA077067951652" />
              <DetailItem label="Installation Date" value="-" />
              <DetailItem label="Good Tax Amount" value="-" />
              <DetailItem label="Token Tax Amount" value="-" />
              <DetailItem label="National Permit Amount" value="-" />
              <DetailItem label="State Permit Amount" value="-" />
              <DetailItem label="Service Alert Date" value="-" />
              <DetailItem label="Odometer Service Alert" value="-" />
              <DetailItem label="Remarks" value={vehicleDetails?.remarks} />
            </CardContent>
          </Card>

          {/* Daily Status */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Daily Status</CardTitle>
                <Badge variant={vehicle.status === 'Moving' ? 'success' : 'secondary'}>{vehicle.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">As of {new Date().toLocaleDateString('en-GB')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground">DISTANCE</p>
                        <p className="text-lg font-bold">{vehicle.distance.toFixed(1)} km</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">SPEED</p>
                        <p className="text-lg font-bold">{vehicle.speed} km/h</p>
                    </div>
                </div>
                <div className="space-y-2 pt-4 border-t">
                    <DailyStatusItem label="BBID" value="C868477067851652" />
                    <DailyStatusItem label="Driver Name" value={vehicleDetails?.driver} />
                    <DailyStatusItem label="Driver Mobile" value={null} />
                    <DailyStatusItem label="Coordinates" value="30.92, 76.83" />
                    <DailyStatusItem label="Two Way Comms" value="5754160173629" />
                </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailDialog;