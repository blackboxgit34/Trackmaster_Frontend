import { useEffect, useRef, memo, useCallback } from 'react';

const WavyBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const bubbleContainerRef = useRef<SVGGElement>(null);
  const bubblesDataRef = useRef<any[]>([]);
  const animationFrameId = useRef<number>();
  const phase1 = useRef(Math.random() * Math.PI * 2);
  const phase2 = useRef(Math.random() * Math.PI * 2);

  const gradientId = `gradient-${payload.vehicle.replace(/[^a-zA-Z0-9]/g, '')}`;
  const clipId = `clip-${payload.vehicle.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (height <= 0) {
    return null;
  }

  const waveAmplitude = 4;
  const waveFrequency = 2;

  const createWavePath = useCallback((currentPhase: number) => {
    const yTop = y + waveAmplitude;
    let path = `M${x},${y + height} L${x},${yTop}`;
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
        const px = x + (width / segments) * i;
        const angle = currentPhase + (i / segments) * Math.PI * waveFrequency;
        const py = yTop - Math.sin(angle) * waveAmplitude;
        path += ` L${px},${py}`;
    }
    path += ` L${x + width},${y + height} Z`;
    return path;
  }, [x, y, width, height]);

  useEffect(() => {
    bubblesDataRef.current = Array.from({ length: 15 }).map(() => ({
        cx: x + Math.random() * width,
        cy: y + height + Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.3 + 0.1,
        phase: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      phase1.current = (phase1.current + 0.04) % (Math.PI * 2);
      phase2.current = (phase2.current + 0.06) % (Math.PI * 2);
      if (path1Ref.current) {
        path1Ref.current.setAttribute('d', createWavePath(phase1.current));
      }
      if (path2Ref.current) {
        path2Ref.current.setAttribute('d', createWavePath(phase2.current));
      }

      if (bubbleContainerRef.current) {
        const circles = bubbleContainerRef.current.childNodes;
        bubblesDataRef.current.forEach((bubble, i) => {
            bubble.cy -= bubble.speed;
            bubble.cx += Math.sin(bubble.phase + bubble.cy * 0.1) * 0.2;

            if (bubble.cy < y - bubble.r) {
                bubble.cy = y + height;
                bubble.cx = x + Math.random() * width;
            }

            const circle = circles[i] as SVGCircleElement;
            if (circle) {
                circle.setAttribute('cx', String(bubble.cx));
                circle.setAttribute('cy', String(bubble.cy));
                circle.setAttribute('r', String(bubble.r));
                circle.setAttribute('fill-opacity', String(bubble.opacity));
            }
        });
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [x, y, width, height, createWavePath]);

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b34700" />
          <stop offset="100%" stopColor="#2b0000" />
        </linearGradient>
        <clipPath id={clipId}>
            <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      
      <path
        ref={path1Ref}
        d={createWavePath(phase1.current)}
        fill={`url(#${gradientId})`}
        fillOpacity="0.5"
      />
      <path
        ref={path2Ref}
        d={createWavePath(phase2.current)}
        fill={`url(#${gradientId})`}
        fillOpacity="1"
      />

      <g ref={bubbleContainerRef} clipPath={`url(#${clipId})`}>
        {Array.from({ length: 15 }).map((_, i) => (
            <circle key={i} fill="white" />
        ))}
      </g>
    </g>
  );
};

export default memo(WavyBar);