import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search } from 'lucide-react';
import { GoogleMap, Polygon, Circle } from '@react-google-maps/api';
import { API_BASE_URL } from '@/config/Api';

// ── Types ────────────────────────────────────────────────────────────────────

interface LatLng {
  lat: number;
  lng: number;
}

interface GeofenceShape {
  id: number;
  name: string;
  type: 'circle' | 'polygon';
  machines: string[];
  isActive: boolean;
  radius?: number;
  center?: LatLng;
  paths?: LatLng[];
}

interface GeofenceVehicleItem {
  vehName: string;
  bbid: string;
}

interface LatLongHistory {
  latitude: number;
  longitude: number;
}

interface GeofenceModel {
  fenceId: number;
  fenceName: string;
  radius: string;
  fenceType: string;
  isActive: boolean;
  vehicleLists: GeofenceVehicleItem[];
  latLongList: LatLongHistory[];
}

interface GetGeofenceListResponse {
  data: GeofenceModel[];
  count: number;
  vehicleList: unknown[];
}

// ── Transform ────────────────────────────────────────────────────────────────

const transformGeofenceData = (apiData: GeofenceModel): GeofenceShape => {
  const isCircle = apiData.fenceType?.toLowerCase() === 'circle';
  return {
    id: apiData.fenceId,
    name: apiData.fenceName,
    type: isCircle ? 'circle' : 'polygon',
    machines: (apiData.vehicleLists || []).map(v => v.bbid),
    isActive: apiData.isActive,
    radius: isCircle ? parseInt(apiData.radius) || 0 : undefined,
    paths:
      !isCircle && apiData.latLongList?.length > 0
        ? apiData.latLongList.map(c => ({ lat: c.latitude, lng: c.longitude }))
        : undefined,
    center:
      isCircle && apiData.latLongList?.length > 0
        ? { lat: apiData.latLongList[0].latitude, lng: apiData.latLongList[0].longitude }
        : undefined,
  };
};

// ── Map config ───────────────────────────────────────────────────────────────

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const mapOptions = { disableDefaultUI: true, zoomControl: true };

// ── Component ────────────────────────────────────────────────────────────────

const ViewFence = () => {
  const [fences, setFences] = useState<GeofenceShape[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFenceId, setSelectedFenceId] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchFences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const raw = localStorage.getItem('trackmaster-auth');
      const custId = raw ? JSON.parse(raw)?.custId : null;

      if (!custId) {
        setError('Customer ID not found. Please log in again.');
        return;
      }

      const queryParams = new URLSearchParams({
        CustId: String(custId),
        iDisplayStart: '0',
        iDisplayLength: '100000',
        sSearch: '',
        sSortColumn: 'FenceId',
        sSortDir: 'desc',
      });

      const response = await fetch(
        `${API_BASE_URL}/Geofence/GetGeofenceList?${queryParams}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Server error ${response.status}: ${response.statusText}`);
      }

      const result: GetGeofenceListResponse = await response.json();

      if (!result.data) {
        throw new Error('No data returned from server');
      }

      setFences(result.data.map(transformGeofenceData));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch geofences';
      console.error('[ViewFence] fetch error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFences(); }, [fetchFences]);

  // ── Pan / zoom on select ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !selectedFenceId) return;
    const fence = fences.find(f => f.id === selectedFenceId);
    if (!fence) return;

    if (fence.type === 'circle' && fence.center) {
      map.panTo(fence.center);
      map.setZoom(13);
    } else if (fence.type === 'polygon' && fence.paths && fence.paths.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      fence.paths.forEach(p => bounds.extend(p));
      map.fitBounds(bounds);
    }
  }, [map, selectedFenceId, fences]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFences(prev => prev.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f));
  };

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const filteredFences = fences.filter(f =>
    f.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Render selected fence overlay only ───────────────────────────────────
  const renderSelectedFenceOverlay = () => {
    if (!selectedFenceId) return null;
    const fence = fences.find(f => f.id === selectedFenceId);
    if (!fence) return null;

    const options = {
      fillColor: '#3B82F6',
      fillOpacity: 0.35,
      strokeColor: '#1D4ED8',
      strokeOpacity: 1,
      strokeWeight: 3,
      zIndex: 2,
    };

    if (fence.type === 'polygon' && fence.paths) {
      return <Polygon key={fence.id} paths={fence.paths} options={options} />;
    }
    if (fence.type === 'circle' && fence.center && fence.radius) {
      return <Circle key={fence.id} center={fence.center} radius={fence.radius} options={options} />;
    }
    return null;
  };

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full">

      {/* Loader — matches ManageFenceTable exactly */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
            <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
            <span className="text-sm">Please wait ...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-[1fr_360px] lg:grid-rows-1 gap-6 h-full">

        {/* Map */}
        <div className="bg-muted rounded-lg relative overflow-hidden">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={5}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {renderSelectedFenceOverlay()}
          </GoogleMap>
        </div>

        {/* Sidebar */}
        <div className="bg-card rounded-lg p-4 flex flex-col border overflow-hidden">
          <h2 className="text-xl font-bold mb-3 text-foreground shrink-0">View Fences</h2>

          {/* Search */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fence…"
              className="pl-9 h-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto pr-1">

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <p className="text-sm text-red-500 text-center">{error}</p>
                <button
                  onClick={fetchFences}
                  className="text-xs text-blue-500 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!error && !loading && filteredFences.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchTerm ? 'No fences match your search.' : 'No fences found.'}
              </p>
            )}

            {/* Fence list */}
            <div className="space-y-2">
              {filteredFences.map(fence => {
                const isSelected = fence.id === selectedFenceId;
                return (
                  <div
                    key={fence.id}
                    onClick={() => setSelectedFenceId(fence.id)}
                    className={[
                      'flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all duration-150',
                      isSelected
                        ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700'
                        : 'bg-muted/40 border-transparent hover:bg-muted/70',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {fence.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={[
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide',
                          fence.type === 'circle'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                        ].join(' ')}>
                          {fence.type}
                        </span>
                        {fence.type === 'circle' && fence.radius != null && (
                          <span className="text-[11px] text-muted-foreground">
                            r = {fence.radius.toLocaleString()} m
                          </span>
                        )}
                      </div>
                      {fence.machines.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {fence.machines.join(', ')}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={fence.isActive}
                      onCheckedChange={() => { }}
                      onClick={e => handleToggle(fence.id, e as React.MouseEvent)}
                      className="data-[state=checked]:bg-blue-500 shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer count */}
          {!loading && !error && fences.length > 0 && (
            <p className="text-xs text-muted-foreground text-right mt-2 shrink-0">
              {filteredFences.length} of {fences.length} fence{fences.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewFence;