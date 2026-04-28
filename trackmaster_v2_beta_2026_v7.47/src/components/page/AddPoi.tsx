import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleMap, Marker, StandaloneSearchBox, Circle } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import type { Poi } from '@/data/poiData';

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

const circleOptions = {
  strokeColor: '#3B82F6',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#3B82F6',
  fillOpacity: 0.35,
};

interface AddPoiProps {
  onAddPoi: (poi: Poi) => void;
}

const AddPoi = ({ onAddPoi }: AddPoiProps) => {
  const { toast } = useToast();
  const [radius, setRadius] = useState(200);
  const [poiMethod, setPoiMethod] = useState<'location' | 'latlong'>('location');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [poiName, setPoiName] = useState('');

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(pos);
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
    }
  }, []);

  const onSearchBoxLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const onPlacesChanged = useCallback(() => {
    if (searchBox && map) {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.geometry && place.geometry.location) {
          const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
          setMarkerPosition(pos);
          setLat(pos.lat.toFixed(6));
          setLng(pos.lng.toFixed(6));
          map.panTo(pos);
          map.setZoom(15);
        }
      }
    }
  }, [searchBox, map]);

  const handleReset = () => {
    setRadius(200);
    setPoiMethod('location');
    setMarkerPosition(null);
    setLat('');
    setLng('');
    setPoiName('');
    if (map) {
      map.panTo(center);
      map.setZoom(5);
    }
  };

  const handleCreatePoi = () => {
    if (!poiName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the POI.", variant: "destructive" });
      return;
    }
    if (!markerPosition) {
      toast({ title: "Error", description: "Please select a location on the map.", variant: "destructive" });
      return;
    }

    const newPoi: Poi = {
      id: `poi-${Date.now()}`,
      poiName: poiName.trim(),
      latitude: markerPosition.lat,
      longitude: markerPosition.lng,
      radius: radius,
    };

    onAddPoi(newPoi);
    toast({ variant: "success", title: "Success", description: `POI "${newPoi.poiName}" has been created.` });
    handleReset();
  };

  return (
    <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-[1fr_350px] lg:grid-rows-1 gap-6 h-full">
      {/* Map Section */}
      <div className="bg-muted rounded-lg relative overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={5}
          options={mapOptions}
          onLoad={onMapLoad}
          onClick={onMapClick}
        >
          {markerPosition && (
            <>
              <Marker position={markerPosition} />
              <Circle
                center={markerPosition}
                radius={radius}
                options={circleOptions}
              />
            </>
          )}
        </GoogleMap>
      </div>

      {/* Control Panel Sidebar */}
      <div className="bg-card rounded-lg p-4 flex flex-col border overflow-hidden">
        <h2 className="text-xl font-bold mb-4 text-foreground shrink-0">
          Create POI
        </h2>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-6">
            <div className="bg-muted p-1 rounded-lg grid grid-cols-2 gap-1">
              <Button
                variant="ghost"
                onClick={() => setPoiMethod('location')}
                className={cn(
                  'w-full h-9',
                  poiMethod === 'location'
                    ? 'bg-brand-blue text-white hover:bg-brand-blue/90'
                    : 'hover:bg-muted-foreground/10'
                )}
              >
                With Location
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPoiMethod('latlong')}
                className={cn(
                  'w-full h-9',
                  poiMethod === 'latlong'
                    ? 'bg-brand-blue text-white hover:bg-brand-blue/90'
                    : 'hover:bg-muted-foreground/10'
                )}
              >
                With Lat-Long
              </Button>
            </div>

            {poiMethod === 'location' ? (
              <div>
                <Label htmlFor="search-location">Search Location</Label>
                <div className="relative mt-1">
                  <StandaloneSearchBox
                    onLoad={onSearchBoxLoad}
                    onPlacesChanged={onPlacesChanged}
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search-location"
                        placeholder="e.g., Mumbai Airport"
                        className="pl-9 w-full"
                      />
                    </div>
                  </StandaloneSearchBox>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input id="latitude" placeholder="e.g., 19.0760" value={lat} onChange={e => setLat(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input id="longitude" placeholder="e.g., 72.8777" value={lng} onChange={e => setLng(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="poi-name">POI Name</Label>
              <div className="relative mt-1">
                <Input
                  id="poi-name"
                  placeholder="Enter a name for the POI"
                  value={poiName}
                  onChange={e => setPoiName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="poi-radius-input">Set POI Radius</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  id="poi-radius-slider"
                  min={50}
                  max={5000}
                  step={50}
                  value={[radius]}
                  onValueChange={(value) => setRadius(value[0])}
                  className="flex-1"
                />
                <div className="relative w-28">
                  <Input
                    id="poi-radius-input"
                    type="number"
                    value={radius}
                    onChange={(e) => {
                      const value = e.target.value;
                      const num = parseInt(value, 10);
                      if (value === '') {
                        setRadius(0); // Allow temporary empty/0 state
                      } else if (!isNaN(num)) {
                        setRadius(num);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (isNaN(value) || value < 50) {
                        setRadius(50);
                      } else if (value > 5000) {
                        setRadius(5000);
                      }
                    }}
                    className="pr-8 text-right"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground pointer-events-none">
                    m
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <h3 className="font-semibold text-foreground text-sm">
                Instructions:
              </h3>
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                <li>Click on the map to place a marker or search for a location.</li>
                <li>Add the location name in the text-box and click Create.</li>
                <li>All saved POIs will be visible on the "Manage POI" page.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-4 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <Button className="bg-brand-blue text-white hover:bg-brand-blue/90" onClick={handleCreatePoi}>
              Save POI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPoi;