import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface MapControlsProps {
  showLabels: boolean;
  setShowLabels: (checked: boolean) => void;
  autoRefresh?: boolean;
  setAutoRefresh?: (checked: boolean) => void;
  autoZoom?: boolean;
  setAutoZoom?: (checked: boolean) => void;
  showPois: boolean;
  setShowPois: (checked: boolean) => void;
  showFences: boolean;
  setShowFences: (checked: boolean) => void;
  showStoppages?: boolean;
  setShowStoppages?: (checked: boolean) => void;
}

const MapControls = ({
  showLabels,
  setShowLabels,
  autoRefresh,
  setAutoRefresh,
  autoZoom,
  setAutoZoom,
  showPois,
  setShowPois,
  showFences,
  setShowFences,
  showStoppages,
  setShowStoppages,
}: MapControlsProps) => {
  return (
    <div className="absolute top-4 right-4 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="shadow-lg">
            <Settings2 className="h-5 w-5" />
            <span className="sr-only">Map Options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Map Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={showLabels}
            onCheckedChange={setShowLabels}
          >
            Show Labels
          </DropdownMenuCheckboxItem>
          {autoRefresh !== undefined && setAutoRefresh && (
            <DropdownMenuCheckboxItem
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            >
              Auto Refresh (30s)
            </DropdownMenuCheckboxItem>
          )}
          {autoZoom !== undefined && setAutoZoom && (
            <DropdownMenuCheckboxItem
              checked={autoZoom}
              onCheckedChange={setAutoZoom}
            >
              Auto Zoom
            </DropdownMenuCheckboxItem>
          )}
          <DropdownMenuCheckboxItem
            checked={showFences}
            onCheckedChange={setShowFences}
          >
            Show Fences
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showPois}
            onCheckedChange={setShowPois}
          >
            Show POIs
          </DropdownMenuCheckboxItem>
          {showStoppages !== undefined && setShowStoppages && (
            <DropdownMenuCheckboxItem
              checked={showStoppages}
              onCheckedChange={setShowStoppages}
            >
              Show Stoppages
            </DropdownMenuCheckboxItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MapControls;