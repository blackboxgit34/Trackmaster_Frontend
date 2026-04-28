import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, FastForward } from 'lucide-react';
import { useMemo, useState, useRef } from 'react';

interface FuelPlaybackTimelineProps {
  startTime: number;
  endTime: number;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  currentData: any | null;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSliderChange: (value: number) => void;
  path: any[];
  onSpeedSelectOpenChange: (open: boolean) => void;
}

const FuelPlaybackTimeline = ({
  startTime,
  endTime,
  currentTime,
  isPlaying,
  speed,
  currentData,
  onPlayPause,
  onSpeedChange,
  onSliderChange,
  path,
  onSpeedSelectOpenChange,
}: FuelPlaybackTimelineProps) => {
  const duration = (endTime - startTime) / 1000;
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; time: string } | null>(null);

  const formatDuration = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      return '00:00:00';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const segments = useMemo(() => {
    if (!path || path.length < 2 || duration === 0) return [];
    
    return path.slice(0, -1).map((point, index) => {
      const nextPoint = path[index + 1];
      const segmentStart = (point.timestamp - startTime) / 1000;
      const segmentEnd = (nextPoint.timestamp - startTime) / 1000;
      
      const type = point.speed > 0 ? 'moving' : 'stopped';

      return {
        startPercent: (segmentStart / duration) * 100,
        widthPercent: ((segmentEnd - segmentStart) / duration) * 100,
        type,
      };
    });
  }, [path, duration, startTime]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderContainerRef.current || duration <= 0) return;

    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const hoverTime = progress * duration;

    setTooltip({
      visible: true,
      x: x,
      time: formatDuration(hoverTime),
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="bg-card/90 backdrop-blur-sm rounded-xl shadow-lg p-1.5 flex items-center gap-2 w-full max-w-5xl mx-auto">
      {/* Play/Pause Button */}
      <Button size="icon" onClick={onPlayPause} className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
        {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
      </Button>

      {/* Timeline Slider */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[11px] font-mono text-muted-foreground">{formatDuration(currentTime)}</span>
        <div 
          className="relative w-full flex items-center"
          ref={sliderContainerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {tooltip?.visible && (
            <div 
              className="absolute bottom-full mb-2 px-2 py-1 bg-foreground text-background text-xs font-mono rounded-md shadow-lg pointer-events-none"
              style={{ left: `${tooltip.x}px`, transform: 'translateX(-50%)' }}
            >
              {tooltip.time}
            </div>
          )}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 flex rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            {segments.map((seg, index) => (
              <div
                key={index}
                className={seg.type === 'moving' ? 'bg-blue-500' : 'bg-red-500'}
                style={{
                  left: `${seg.startPercent}%`,
                  width: `${seg.widthPercent}%`,
                  position: 'absolute',
                  height: '100%',
                }}
              />
            ))}
          </div>
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={(value) => onSliderChange(value[0])}
            className="w-full"
          />
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">{formatDuration(duration)}</span>
      </div>

      {/* Speed Selector */}
      <Select
        value={String(speed)}
        onValueChange={(value) => onSpeedChange(Number(value))}
        onOpenChange={onSpeedSelectOpenChange}
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

      {/* Data Readouts */}
      <div className="flex items-center gap-3 pr-2">
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

export default FuelPlaybackTimeline;