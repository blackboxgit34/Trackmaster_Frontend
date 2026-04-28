import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search } from 'lucide-react';
import { GoogleMap, Polygon, Circle } from '@react-google-maps/api';
import type { GeofenceShape } from '@/data/geofenceMapData';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 20.5937,
  lng: 78.9629,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
};

interface ViewFenceProps {
  fences: GeofenceShape[];
  onUpdateFences: (fences: GeofenceShape[]) => void;
}

const ViewFence = ({ fences, onUpdateFences }: ViewFenceProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFenceId, setSelectedFenceId] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const handleToggle = (id: number) => {
    const updatedFences = fences.map((fence) =>
      fence.id === id ? { ...fence, isActive: !fence.isActive } : fence
    );
    onUpdateFences(updatedFences);
  };

  const filteredFences = fences.filter((fence) =>
    fence.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  useEffect(() => {
    if (map && selectedFenceId) {
      const fence = fences.find(f => f.id === selectedFenceId);
      if (fence) {
        if (fence.type === 'circle' && fence.center) {
          map.panTo(fence.center);
          map.setZoom(12);
        } else if (fence.type === 'polygon' && fence.paths) {
          const bounds = new window.google.maps.LatLngBounds();
          fence.paths.forEach(path => bounds.extend(path));
          map.fitBounds(bounds);
        }
      }
    }
  }, [map, selectedFenceId, fences]);

  return (
    <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-[1fr_350px] lg:grid-rows-1 gap-6 h-full">
      {/* Map Section */}
      <div className="bg-muted rounded-lg relative overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={5}
          options={mapOptions}
          onLoad={onLoad}
        >
          {fences.map(fence => {
            const isSelected = fence.id === selectedFenceId;
            const options = {
              fillColor: '#3B82F6',
              fillOpacity: isSelected ? 0.4 : 0.2,
              strokeColor: '#3B82F6',
              strokeOpacity: 1,
              strokeWeight: isSelected ? 3 : 2,
              zIndex: isSelected ? 2 : 1,
            };

            if (fence.type === 'polygon' && fence.paths) {
              return <Polygon key={fence.id} paths={fence.paths} options={options} />;
            }
            if (fence.type === 'circle' && fence.center && fence.radius) {
              return <Circle key={fence.id} center={fence.center} radius={fence.radius} options={options} />;
            }
            return null;
          })}
        </GoogleMap>
      </div>

      {/* Control Panel Sidebar */}
      <div className="bg-card rounded-lg p-4 flex flex-col border overflow-hidden">
        <h2 className="text-xl font-bold mb-3 text-foreground shrink-0">View Fence</h2>
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fence"
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            {filteredFences.map((fence) => (
              <div
                key={fence.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer"
                onClick={() => setSelectedFenceId(fence.id)}
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {fence.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fence.machines.join(', ')}
                  </p>
                </div>
                <Switch
                  checked={fence.isActive}
                  onCheckedChange={() => handleToggle(fence.id)}
                  className="data-[state=checked]:bg-brand-blue"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewFence;