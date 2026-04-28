import React from 'react';

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
  return d;
};

const SpeedGauge: React.FC<SpeedGaugeProps> = ({ speed, maxSpeed = 120 }) => {
  const percentage = Math.max(0, Math.min(100, (speed / maxSpeed) * 100));
  const needleAngle = (percentage / 100) * 180 - 90;
  
  const numSegments = 5;
  const totalAngle = 180;
  const gapAngle = 4;
  const totalGapAngle = (numSegments - 1) * gapAngle;
  const segmentAngle = (totalAngle - totalGapAngle) / numSegments;
  
  const segments = [];
  const colors = [
    '#22c55e', // Green
    '#84cc16', // Lime
    '#f59e0b', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
  ];

  let currentAngle = -90;
  for (let i = 0; i < numSegments; i++) {
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    segments.push({
      d: describeArc(50, 50, 40, startAngle, endAngle),
      color: colors[i],
    });
    currentAngle = endAngle + gapAngle;
  }

  return (
    <div className="relative w-32 h-auto mx-auto my-4">
      <svg viewBox="0 0 100 80" className="w-full overflow-visible">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.d}
            fill="none"
            stroke={segment.color}
            strokeWidth="12"
            strokeLinecap="butt"
          />
        ))}
        
        <g 
          transform={`rotate(${needleAngle} 50 50)`}
        >
          <polygon points="48,50 52,50 50,20" fill="#3b82f6" />
        </g>

        {/* Center pin drawn on top of the needle's base */}
        <circle cx="50" cy="50" r="4" fill="hsl(var(--foreground))" />
        <circle cx="50" cy="50" r="1.5" fill="#3b82f6" />

        <text x="10" y="58" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="bold">0</text>
        <text x="90" y="58" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="bold">{maxSpeed}</text>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center pt-[85px]">
        <div className="flex items-baseline">
          <span className="text-xl font-bold">{speed}</span>
          <span className="text-sm text-muted-foreground font-medium ml-1">km/h</span>
        </div>
        <p className="text-xs text-muted-foreground font-semibold tracking-widest -mt-1">SPEED</p>
      </div>
    </div>
  );
};

export default SpeedGauge;