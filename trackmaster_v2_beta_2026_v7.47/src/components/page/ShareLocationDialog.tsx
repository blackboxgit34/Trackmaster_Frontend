import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Copy, RadioTower, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LiveVehicleStatus } from '@/types';
import { GoogleMap, Marker } from '@react-google-maps/api';

interface ShareLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: LiveVehicleStatus | null;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
};

const ShareLocationDialog = ({ open, onOpenChange, vehicle }: ShareLocationDialogProps) => {
  const { toast } = useToast();
  const [duration, setDuration] = useState('1_hour');
  const [generatedLink, setGeneratedLink] = useState('');

  const position = vehicle ? { lat: vehicle.lat, lng: vehicle.lng } : null;

  const handleGenerateLink = (type: 'live' | 'current') => {
    if (!vehicle) return;
    const baseUrl = 'https://trackmaster.maps/share';
    const link = `${baseUrl}?vehicle=${vehicle.id}&type=${type}${type === 'live' ? `&duration=${duration}` : ''}`;
    setGeneratedLink(link);
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast({
      variant: 'success',
      title: 'Link Copied!',
      description: 'The location link has been copied to your clipboard.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Share Location for {vehicle?.vehicleNo}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-muted rounded-lg relative h-48 overflow-hidden">
            {position ? (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={position}
                  zoom={15}
                  options={mapOptions}
                >
                  <Marker position={position} />
                </GoogleMap>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Location not available.</p>
              </div>
            )}
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <RadioTower className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold">Share Live Location</h3>
                  <p className="text-xs text-muted-foreground">Share your live location for a specific duration.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15_mins">Until 15 minutes</SelectItem>
                    <SelectItem value="1_hour">Until 1 hour</SelectItem>
                    <SelectItem value="8_hours">Until 8 hours</SelectItem>
                    <SelectItem value="24_hours">Until 24 hours</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleGenerateLink('live')}>
                  Get Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-start gap-4">
                <Target className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Share Current Location</h3>
                  <p className="text-xs text-muted-foreground">Share a snapshot of where you are right now.</p>
                </div>
              </div>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleGenerateLink('current')}>
                Get Link
              </Button>
            </CardContent>
          </Card>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Generated Link</label>
            <div className="relative mt-1">
              <Input
                readOnly
                value={generatedLink}
                placeholder="Your generated link will appear here..."
                className="pr-20"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={handleCopy}
                disabled={!generatedLink}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLocationDialog;