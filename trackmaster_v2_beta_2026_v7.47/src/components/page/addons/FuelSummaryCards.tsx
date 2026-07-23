import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React, { memo, useState, useEffect } from 'react';

// --- Reusable Stat Block Component ---
const InfoBlock = ({ title, value, unit, valueColor, children, className }: { title: string; value: string; unit: string; valueColor?: string; children?: React.ReactNode, className?: string }) => (
  <div className={cn("bg-muted/50 border border-border/40 rounded-lg p-2 shadow-sm", className)}>
    <p className="text-xs text-muted-foreground">{title}</p>
    <div className="flex items-baseline">
      <p className={cn("text-xl font-bold", valueColor)}>{value}</p>
      <p className="text-xs text-muted-foreground ml-1">{unit}</p>
    </div>
    {children}
  </div>
);

// --- Fizz Bubbles Definition for Fuel Tank ---
const FIZZ_BUBBLES = Array.from({ length: 35 }, (_, i) => {
  const r1 = (Math.sin(i * 17.31 + 4.13) + 1) / 2;
  const r2 = (Math.cos(i * 13.91 + 2.77) + 1) / 2;
  const r3 = (Math.sin(i * 29.57 + 8.19) + 1) / 2;

  const xBase = 70 + r1 * 260; // 70 to 330
  const xDrift = (r2 - 0.5) * 15; // -7.5 to 7.5
  const radius = 0.6 + r3 * 1.4; // 0.6 to 2.0
  const duration = 1.5 + r2 * 2.5; // 1.5s to 4.0s
  const delay = -r1 * 4; // negative delay to offset start times

  return {
    id: i,
    cxValues: `${xBase.toFixed(1)};${(xBase + xDrift).toFixed(1)};${(xBase - xDrift).toFixed(1)};${xBase.toFixed(1)}`,
    duration: `${duration.toFixed(2)}s`,
    delay: `${delay.toFixed(2)}s`,
    r: parseFloat(radius.toFixed(2)),
  };
});

// --- Fuel Tank Component ---
const FuelTank = memo(({ capacity, level }: { capacity: number, level: number }) => {
  const percentage = capacity > 0 ? Math.max(0, Math.min(100, (level / capacity) * 100)) : 0;
  const currentTextColor = percentage < 20 ? '#ef4444' : percentage < 40 ? '#f59e0b' : '#16a34a';

  // Tank window dimensions
  const windowY = 110;
  const windowHeight = 105;
  const windowBottom = 215;

  // Calculate dynamic Y level for the fuel surface inside the window
  const liquidHeight = windowHeight * (percentage / 100);
  const liquidY = windowBottom - liquidHeight;

  // Wave animation parameters
  const waveAmplitude = 5;

  // Create dynamic wave paths for animation inside the window (x=55 to x=345, width=290)
  const wavePath1 = `M55,${liquidY} Q127.5,${liquidY - waveAmplitude},200,${liquidY} T345,${liquidY} V215 H55 Z`;
  const wavePath2 = `M55,${liquidY} Q127.5,${liquidY + waveAmplitude},200,${liquidY} T345,${liquidY} V215 H55 Z`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 70 400 180" width="100%" height="100%">
      <defs>
        {/* Brushed metallic texture gradient for the main truck tank */}
        <linearGradient id="tankMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#44444c" />
          <stop offset="8%" stopColor="#787880" />
          <stop offset="18%" stopColor="#d8d8e0" />
          <stop offset="28%" stopColor="#f0f0f5" />
          <stop offset="45%" stopColor="#a8a8b0" />
          <stop offset="70%" stopColor="#686870" />
          <stop offset="90%" stopColor="#909098" />
          <stop offset="100%" stopColor="#383840" />
        </linearGradient>

        {/* Metallic strap gradient */}
        <linearGradient id="strapMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#202025" />
          <stop offset="20%" stopColor="#484850" />
          <stop offset="50%" stopColor="#282830" />
          <stop offset="80%" stopColor="#484850" />
          <stop offset="100%" stopColor="#181820" />
        </linearGradient>

        {/* Clear amber/diesel liquid gradient */}
        <linearGradient id="fuelLiquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.95" />
        </linearGradient>

        {/* Tank inner shadow depth */}
        <linearGradient id="windowDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f1015" />
          <stop offset="100%" stopColor="#222328" />
        </linearGradient>

        {/* Glass shine gradient */}
        <linearGradient id="glassOverlay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="25%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="26%" stopColor="#ffffff" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        <filter id="s" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".3" />
        </filter>
        <clipPath id="windowClip">
          <rect x="55" y="110" width="290" height="105" rx="15" />
        </clipPath>
      </defs>

      {/* Shadow backdrop of the tank body */}
      <rect x="45" y="100" width="310" height="125" rx="35" fill="black" opacity="0.25" filter="url(#s)" />

      {/* Filler Cap Neck */}
      <rect x="85" y="83" width="20" height="12" fill="url(#strapMetal)" stroke="#333" strokeWidth="1" />
      {/* Filler Cap Lid with threading ribs */}
      <rect x="75" y="75" width="40" height="8" rx="2" fill="url(#tankMetal)" stroke="#444" strokeWidth="1" />
      <line x1="83" y1="76" x2="83" y2="82" stroke="#222" strokeWidth="1.5" />
      <line x1="90" y1="76" x2="90" y2="82" stroke="#222" strokeWidth="1.5" />
      <line x1="95" y1="76" x2="95" y2="82" stroke="#222" strokeWidth="1.5" />
      <line x1="100" y1="76" x2="100" y2="82" stroke="#222" strokeWidth="1.5" />
      <line x1="107" y1="76" x2="107" y2="82" stroke="#222" strokeWidth="1.5" />

      {/* Main Metallic Tank Body */}
      <rect x="40" y="95" width="320" height="135" rx="35" fill="url(#tankMetal)" stroke="#555" strokeWidth="1.2" />

      {/* Inspection Window Glass Background (tank depth) */}
      <rect x="55" y="110" width="290" height="105" rx="15" fill="url(#windowDepth)" stroke="#333" strokeWidth="1" />

      {/* Liquid Wave & Bubbles Clipped to Inspection Window */}
      <g clipPath="url(#windowClip)">
        <path fill="url(#fuelLiquid)">
          <animate attributeName="d" dur="5s" repeatCount="indefinite"
            values={`${wavePath1};${wavePath2};${wavePath1}`} />
        </path>

        <g fill="#fff" fillOpacity="0.45">
          {FIZZ_BUBBLES.map((bubble) => (
            <circle key={bubble.id} r={bubble.r}>
              <animate
                attributeName="cx"
                values={bubble.cxValues}
                dur={bubble.duration}
                begin={bubble.delay}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`215;${liquidY}`}
                dur={bubble.duration}
                begin={bubble.delay}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0.8;0.8;0"
                dur={bubble.duration}
                begin={bubble.delay}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      </g>

      {/* Glass Gloss/Sheen Highlights */}
      <path d="M 75 110 L 150 110 L 55 205 L 55 130 Z" fill="rgba(255, 255, 255, 0.12)" pointerEvents="none" />
      <rect x="55" y="110" width="290" height="105" rx="15" fill="url(#glassOverlay)" pointerEvents="none" style={{ mixBlendMode: 'screen' }} />

      {/* Mounting Straps wrapping around the tank */}
      <rect x="110" y="94" width="16" height="137" rx="1" fill="url(#strapMetal)" stroke="#222" strokeWidth="0.8" />
      <rect x="274" y="94" width="16" height="137" rx="1" fill="url(#strapMetal)" stroke="#222" strokeWidth="0.8" />
      
      {/* Mounting Strap Rivets/Bolts */}
      <circle cx="118" cy="102" r="2" fill="#bbb" stroke="#333" strokeWidth="0.5" />
      <circle cx="118" cy="223" r="2" fill="#bbb" stroke="#333" strokeWidth="0.5" />
      <circle cx="282" cy="102" r="2" fill="#bbb" stroke="#333" strokeWidth="0.5" />
      <circle cx="282" cy="223" r="2" fill="#bbb" stroke="#333" strokeWidth="0.5" />

      {/* Modern Digital LED Display Badge */}
      <g textAnchor="middle">
        {/* Outer badge screen container */}
        <rect x="155" y="142" width="90" height="40" rx="6" fill="#0d0e14" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.4" />
        {/* Inner screen */}
        <rect x="159" y="146" width="82" height="32" rx="4" fill="#050608" />
        {/* Glowing Status Indicator light */}
        <circle cx="170" cy="154" r="2.2" fill={currentTextColor} />
        {/* Label text */}
        <text x="204" y="155" fontFamily="sans-serif" fontSize="4.5" fontWeight="800" fill="#6b7280" letterSpacing="0.6">DIESEL LEVEL</text>
        <path d="M165,159 L235,159" stroke="#1f2937" strokeWidth="0.5" />
        {/* Liters LED Reading */}
        <text x="200" y="173" fontFamily="monospace" fontSize="11" fontWeight="900" fill={currentTextColor}>
          {level.toFixed(0)}
          <tspan fontSize="6" fontFamily="sans-serif" fontWeight="500" fill="#4b5563" dx="1">L</tspan>
        </text>
      </g>
    </svg>
  );
});

interface FuelSummaryCardsProps {
  tankCapacity: number;
  currentFuel: number;
  emptySpace: number;
  refillsCount: number;
  totalFilling: number;
  drainageCount: number;
  totalDrainage: number;
}

const FuelSummaryCards = ({
  tankCapacity,
  currentFuel,
  emptySpace,
  refillsCount,
  totalFilling,
  drainageCount,
  totalDrainage,
}: FuelSummaryCardsProps) => {
  const fuelPercentage = tankCapacity > 0 ? (currentFuel / tankCapacity) * 100 : 0;

  // Calculate stroke dashoffset for the circular progress animation
  const clampedPercentage = Math.min(100, Math.max(0, fuelPercentage));
  const circleRadius = 40;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const targetOffset = circleCircumference - (clampedPercentage / 100) * circleCircumference;

  // Add animation state
  const [animatedOffset, setAnimatedOffset] = useState(circleCircumference);

  useEffect(() => {
    // Delay slightly to trigger the CSS transition upon mounting/updating
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 50);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">

      {/* Tank Information Card */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <div className="flex items-center gap-2 justify-between">
            <CardTitle className="text-base font-semibold">
              Tank Information
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex items-center justify-between gap-4">

            {/* Left Side: Stats */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-muted-foreground">Fuel in Tank</span>
                <span className="text-[14px] font-bold text-green-600 dark:text-green-400">{currentFuel.toFixed(0)}L</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-muted-foreground">Empty Space</span>
                <span className="text-[14px] font-semibold text-foreground">{emptySpace.toFixed(0)}L</span>
              </div>
              <div className="flex justify-between items-center bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 mt-1">
                <span className="text-[13px] text-muted-foreground">Total Capacity</span>
                <span className="text-[14px] font-bold text-foreground">{tankCapacity.toFixed(0)}L</span>
              </div>
            </div>

            {/* Right Side: Circular Progress */}
            <div className="relative w-[110px] h-[110px] flex-shrink-0 ml-2">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={circleRadius}
                  className="stroke-muted fill-none" strokeWidth="10"
                />
                <circle
                  cx="50" cy="50" r={circleRadius}
                  className="stroke-green-600 fill-none transition-all duration-[1200ms] ease-out"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={animatedOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-bold text-green-600 dark:text-green-400 leading-none">{fuelPercentage.toFixed(0)}%</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Fuel</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex items-center justify-center">
          <FuelTank capacity={tankCapacity} level={currentFuel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-base font-semibold">Tank Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-3 grid grid-cols-2 gap-1">
          <InfoBlock title="Refills" value={String(refillsCount).padStart(2, '0')} unit="Times" />
          <InfoBlock title="Total Filling" value={totalFilling.toFixed(0)} unit="Liters" valueColor="text-green-600 dark:text-green-400" />
          <InfoBlock title="Thefts" value={String(drainageCount).padStart(2, '0')} unit="Times" />
          <InfoBlock title="Total Drainage" value={totalDrainage.toFixed(0)} unit="Liters" valueColor="text-destructive" />
        </CardContent>
      </Card>
    </div>
  );
}

export default FuelSummaryCards;