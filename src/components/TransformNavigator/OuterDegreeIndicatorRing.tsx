/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';

export interface OuterDegreeIndicatorRingProps {
  theme?: 'light' | 'dark';
  size?: number;
  highlightAngle?: number | null;
  className?: string;
  showSubTicks?: boolean;
}

interface DegreeMark {
  deg: number;
  label?: string;
  isCardinal: boolean;
  is45: boolean;
  is15: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  textX?: number;
  textY?: number;
}

export const OuterDegreeIndicatorRing: React.FC<OuterDegreeIndicatorRingProps> = ({
  theme = 'dark',
  size = 230,
  highlightAngle = null,
  className = '',
  showSubTicks = true,
}) => {
  const isLight = theme === 'light';

  // Compute fixed 360-degree ticks and cardinal/diagonal labels in 230x230 viewBox
  const marks = useMemo<DegreeMark[]>(() => {
    const list: DegreeMark[] = [];
    const cx = 115;
    const cy = 115;
    const rOuter = 111;
    const rText = 94.5;

    // Step by 5 degrees for a total of 72 divisions
    for (let deg = 0; deg < 360; deg += 5) {
      const isCardinal = deg % 90 === 0;
      const is45 = deg % 45 === 0;
      const is15 = deg % 15 === 0;

      let tickLen = 2.5;
      if (isCardinal) tickLen = 8.5;
      else if (is45) tickLen = 6.5;
      else if (is15) tickLen = 4.5;

      const rInner = rOuter - tickLen;
      // Angle: 0° = top (12 o'clock), 90° = right, 180° = bottom, 270° = left
      const rad = ((deg - 90) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const x1 = cx + rOuter * cos;
      const y1 = cy + rOuter * sin;
      const x2 = cx + rInner * cos;
      const y2 = cy + rInner * sin;

      let textX: number | undefined;
      let textY: number | undefined;
      let label: string | undefined;

      // Labels at 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
      if (is45) {
        label = `${deg}°`;
        textX = cx + rText * cos;
        textY = cy + rText * sin;
      }

      list.push({
        deg,
        label,
        isCardinal,
        is45,
        is15,
        x1,
        y1,
        x2,
        y2,
        textX,
        textY,
      });
    }

    return list;
  }, []);

  return (
    <svg
      id="navigator-outer-degree-ring"
      viewBox="0 0 230 230"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none z-10 overflow-visible ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <defs>
        {/* Subtle glow filter for active highlight milestone */}
        <filter id="degree-glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Border Bezel Circle */}
      <circle
        cx="115"
        cy="115"
        r="111"
        fill="none"
        stroke={isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)'}
        strokeWidth="1"
      />

      {/* Mid Subtle Reference Track */}
      <circle
        cx="115"
        cy="115"
        r="102"
        fill="none"
        stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}
        strokeWidth="0.75"
        strokeDasharray="2 3"
      />

      {/* Inner Label Reference Track */}
      <circle
        cx="115"
        cy="115"
        r="88"
        fill="none"
        stroke={isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}
        strokeWidth="0.5"
      />

      {/* Fixed Radial Ticks */}
      <g id="outer-ring-ticks">
        {marks.map((m) => {
          if (!showSubTicks && !m.is15 && !m.is45) return null;

          const isHighlighted =
            highlightAngle !== null &&
            Math.abs(((highlightAngle - m.deg + 540) % 360) - 180) < 3;

          let strokeColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)';
          let strokeW = 0.75;

          if (m.isCardinal) {
            strokeColor = isLight ? 'rgba(24,24,27,0.85)' : 'rgba(255,255,255,0.85)';
            strokeW = 1.6;
          } else if (m.is45) {
            strokeColor = isLight ? 'rgba(82,82,91,0.75)' : 'rgba(255,255,255,0.65)';
            strokeW = 1.3;
          } else if (m.is15) {
            strokeColor = isLight ? 'rgba(113,113,122,0.45)' : 'rgba(255,255,255,0.35)';
            strokeW = 1;
          }

          if (isHighlighted) {
            strokeColor = '#10b981';
            strokeW = 2.2;
          }

          return (
            <line
              key={`tick-${m.deg}`}
              x1={m.x1}
              y1={m.y1}
              x2={m.x2}
              y2={m.y2}
              stroke={strokeColor}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Fixed Degree Text Labels (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) */}
      <g id="outer-ring-degree-labels">
        {marks.map((m) => {
          if (!m.label || m.textX === undefined || m.textY === undefined) return null;

          const isHighlighted =
            highlightAngle !== null &&
            Math.abs(((highlightAngle - m.deg + 540) % 360) - 180) < 3;

          let fill = isLight ? 'rgba(82,82,91,0.85)' : 'rgba(212,212,216,0.75)';
          let fontSize = '7.5';
          let fontWeight = '600';

          if (m.isCardinal) {
            fill = isLight ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.95)';
            fontSize = '8.5';
            fontWeight = '800';
          }

          if (isHighlighted) {
            fill = '#10b981';
            fontWeight = '900';
          }

          return (
            <text
              key={`deg-label-${m.deg}`}
              x={m.textX}
              y={m.textY}
              textAnchor="middle"
              dominantBaseline="central"
              fill={fill}
              fontSize={fontSize}
              fontWeight={fontWeight}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              letterSpacing="-0.02em"
              style={{
                filter: isHighlighted ? 'url(#degree-glow-emerald)' : undefined,
                transition: 'fill 0.15s ease',
              }}
            >
              {m.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
};
