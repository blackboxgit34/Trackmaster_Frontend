import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import React, { memo, useState, useEffect, useMemo } from 'react';

// --- Reusable Stat Block Component ---
const InfoBlock = ({ title, value, unit, valueColor, children, className }: { title: string; value: string; unit: string; valueColor?: string; children?: React.ReactNode, className?: string }) => (
  <div className={cn("bg-muted/50 dark:bg-muted/20 rounded-lg p-2 shadow-sm", className)}>
    <p className="text-xs text-muted-foreground">{title}</p>
    <div className="flex items-baseline">
      <p className={cn("text-xl font-bold", valueColor)}>{value}</p>
      <p className="text-xs text-muted-foreground ml-1">{unit}</p>
    </div>
    {children}
  </div>
);

// --- Fuel Tank Component ---
const FuelTank = memo(({ capacity, level }: { capacity: number, level: number }) => {
  const percentage = capacity > 0 ? Math.max(0, Math.min(100, (level / capacity) * 100)) : 0;

  // Barrel dimensions from SVG
  const barrelX = 40;
  const barrelY = 100;
  const barrelWidth = 320;
  const barrelHeight = 130;
  const barrelRx = 65;
  const barrelBottom = barrelY + barrelHeight; // 230

  // Calculate dynamic Y level for the fuel surface
  const liquidHeight = barrelHeight * (percentage / 100);
  const liquidY = barrelBottom - liquidHeight;

  // Wave animation parameters
  const waveAmplitude = 5;

  // Create dynamic wave paths for animation
  const wavePath1 = `M40,${liquidY} Q120,${liquidY - waveAmplitude},200,${liquidY} T360,${liquidY} V${barrelBottom} H40 Z`;
  const wavePath2 = `M40,${liquidY} Q120,${liquidY + waveAmplitude},200,${liquidY} T360,${liquidY} V${barrelBottom} H40 Z`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 90 400 150" width="100%" height="100%">
      <defs>
        <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--muted) / 0.6)"/>
          <stop offset=".2" stopColor="hsl(var(--muted) / 0.4)"/>
          <stop offset=".5" stopColor="hsl(var(--card) / 0.6)" />
          <stop offset=".8" stopColor="hsl(var(--muted) / 0.4)" />
          <stop offset="1" stopColor="hsl(var(--muted) / 0.6)"/>
        </linearGradient>

        <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b34700" />
          <stop offset="100%" stopColor="#2b0000" />
        </linearGradient>
        
        <filter id="s" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity=".3"/>
        </filter>
        <clipPath id="barrelClip">
          <rect x={barrelX} y={barrelY} width={barrelWidth} height={barrelHeight} rx={barrelRx} />
        </clipPath>
      </defs>

      <rect x="45" y="105" width="310" height="120" rx="60" fill="hsl(var(--muted) / 0.3)"/>

      <g clipPath="url(#barrelClip)">
        <path fill="url(#f)">
          <animate attributeName="d" dur="5s" repeatCount="indefinite"
            values={`${wavePath1};${wavePath2};${wavePath1}`}/>
        </path>

        <g fill="#fff" fillOpacity=".4">
          <circle r="1.5"><animate attributeName="cx" values="100;105;95;100" dur="4s" repeatCount="indefinite" /><animate attributeName="cy" values="220;160" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" /></circle>
          <circle r="1"><animate attributeName="cx" values="250;240;260;250" dur="5s" repeatCount="indefinite" /><animate attributeName="cy" values="225;155" dur="4.2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0.8;0" dur="4.2s" repeatCount="indefinite" /></circle>
          <circle r="2"><animate attributeName="cx" values="180;190;175;180" dur="6s" repeatCount="indefinite" /><animate attributeName="cy" values="215;165" dur="2.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" /></circle>
          <circle r="0.8"><animate attributeName="cx" values="300;310;290;300" dur="3s" repeatCount="indefinite" /><animate attributeName="cy" values="220;160" dur="5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0.7;0" dur="5s" repeatCount="indefinite" /></circle>
          <circle r="1.2"><animate attributeName="cx" values="140;135;145;140" dur="4.5s" repeatCount="indefinite" /><animate attributeName="cy" values="225;160" dur="3.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="3.8s" repeatCount="indefinite" /></circle>
        </g>
      </g>

      <rect x="40" y="100" width="320" height="130" rx="65" fill="url(#t)" stroke="hsl(var(--border))" strokeWidth="1.5" filter="url(#s)" style={{mixBlendMode:'multiply'}}/>
      
      <g fontFamily="Verdana,sans-serif" textAnchor="middle">
        <rect x="175" y="152.5" width="50" height="25" rx="2" fill="#fc0" stroke="#ca0" strokeWidth="1.2"/>
        <text x="200" y="160" fontSize="4.5" fontWeight="700" fill="#222" letterSpacing=".3">DIESEL LEVEL</text>
        <path d="M180,163H220" stroke="#333" strokeWidth=".4" strokeOpacity=".3"/>
        <text x="197" y="174" fontFamily="Courier,monospace" fontSize="10" fontWeight="900" fill="#111">
          {level.toFixed(0)}<tspan fontSize="5" fontFamily="Verdana" fontWeight="400" dx="1">L</tspan>
          <animate attributeName="fill-opacity" values="1;.8;1" dur="3s" repeatCount="indefinite"/>
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-base font-semibold">Tank Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              <InfoBlock title="Tank Capacity" value={tankCapacity.toFixed(0)} unit="Liters">
                <Progress value={fuelPercentage} className="mt-1 h-1.5 [&>*]:bg-green-500" />
              </InfoBlock>
              <div className="grid grid-cols-2 gap-1">
                <InfoBlock title="Fuel in tank" value={currentFuel.toFixed(0)} unit="Liters" valueColor="text-green-500" />
                <InfoBlock title="Empty Space" value={emptySpace.toFixed(0)} unit="Liters" />
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
              <InfoBlock title="Total Filling" value={totalFilling.toFixed(0)} unit="Liters" valueColor="text-green-500" />
              <InfoBlock title="Thefts" value={String(drainageCount).padStart(2, '0')} unit="Times" />
              <InfoBlock title="Total Drainage" value={totalDrainage.toFixed(0)} unit="Liters" valueColor="text-red-500" />
            </CardContent>
          </Card>
        </div>
    )
}

export default FuelSummaryCards;