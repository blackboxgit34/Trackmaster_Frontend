import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, FastForward } from 'lucide-react';

interface PlaybackTimelineProps {
  startTime: string;
  endTime: string;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  currentData: any | null;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSliderChange: (value: number) => void;
}

const PlaybackTimeline = ({
  startTime,
  endTime,
  currentTime,
  isPlaying,
  speed,
  currentData,
  onPlayPause,
  onSpeedChange,
  onSliderChange,
}: PlaybackTimelineProps) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = (end.getTime() - start.getTime()) / 1000; // in seconds

  const formatDuration = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      return '00:00:00';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl bg-card/90 backdrop-blur-sm border rounded-xl shadow-lg p-2 z-10 flex items-center gap-4">
      <Button size="icon" onClick={onPlayPause} className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
        {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-1" />}
      </Button>

      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm font-mono text-muted-foreground">{formatDuration(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={duration}
          step={1}
          onValueChange={(value) => onSliderChange(value[0])}
          className="w-full"
        />
        <span className="text-sm font-mono text-muted-foreground">{formatDuration(duration)}</span>
      </div>

      <Select
        value={String(speed)}
        onValueChange={(value) => onSpeedChange(Number(value))}
      >
        <SelectTrigger className="w-[75px] h-8 rounded-md flex-shrink-0">
          <div className="flex items-center gap-1">
            <FastForward className="h-3.5 w-3.5" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1x</SelectItem>
          <SelectItem value="2">2x</SelectItem>
          <SelectItem value="4">4x</SelectItem>
          <SelectItem value="8">8x</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-4 pr-2">
        <div className="text-center w-16">
          <p className="text-xs text-muted-foreground">Speed</p>
          <p className="text-lg font-bold">{(currentData?.speed || 0).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground -mt-1">km/h</p>
        </div>
        <div className="text-center w-16">
          <p className="text-xs text-muted-foreground">Distance</p>
          <p className="text-lg font-bold">{(currentData?.distance || 0).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground -mt-1">km</p>
        </div>
        <div className="text-center w-16">
          <p className="text-xs text-muted-foreground">Fuel</p>
          <p className="text-lg font-bold">{(currentData?.fuel || 0).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground -mt-1">Liter</p>
        </div>
      </div>
    </div>
  );
};

export default PlaybackTimeline;