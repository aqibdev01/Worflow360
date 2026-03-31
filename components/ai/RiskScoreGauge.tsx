"use client";

import { useEffect, useState } from "react";

interface RiskScoreGaugeProps {
  score: number; // 0.0 to 1.0
  riskLevel: string;
  size?: number;
  className?: string;
}

function getColor(score: number): string {
  if (score < 0.25) return "#22c55e";
  if (score < 0.50) return "#eab308";
  if (score < 0.75) return "#f97316";
  return "#ef4444";
}

function getTrackGradient(score: number): string {
  // SVG gradient ID reference
  return "url(#gaugeGradient)";
}

/**
 * Semicircle SVG gauge showing sprint risk score with animated fill.
 * Colors: green (0-25) → yellow (25-50) → orange (50-75) → red (75-100)
 */
export function RiskScoreGauge({
  score,
  riskLevel,
  size = 180,
  className,
}: RiskScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate from 0 to score on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timer);
  }, [score]);

  const pct = Math.round(animatedScore * 100);
  const color = getColor(animatedScore);

  // SVG semicircle math
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size / 2 - 15;
  const strokeWidth = 12;

  // Semicircle: from 180deg to 0deg (left to right, top is the arc)
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = Math.PI; // 180 degrees

  // Background arc path (full semicircle)
  const bgStartX = cx + radius * Math.cos(startAngle);
  const bgStartY = cy - radius * Math.sin(startAngle);
  const bgEndX = cx + radius * Math.cos(endAngle);
  const bgEndY = cy - radius * Math.sin(endAngle);
  const bgPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 0 1 ${bgEndX} ${bgEndY}`;

  // Filled arc path (animated portion)
  const fillAngle = startAngle - animatedScore * totalArc;
  const fillEndX = cx + radius * Math.cos(fillAngle);
  const fillEndY = cy - radius * Math.sin(fillAngle);
  const largeArc = animatedScore > 0.5 ? 1 : 0;
  const fillPath =
    animatedScore > 0.001
      ? `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${largeArc} 1 ${fillEndX} ${fillEndY}`
      : "";

  return (
    <div className={`flex flex-col items-center ${className || ""}`}>
      <svg
        width={size}
        height={size / 2 + 30}
        viewBox={`0 0 ${size} ${size / 2 + 30}`}
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="33%" stopColor="#eab308" />
            <stop offset="66%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        )}

        {/* Center score text */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={size > 150 ? 32 : 24}
          fontWeight="bold"
        >
          {pct}%
        </text>

        {/* Risk level label */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill={color}
          fontSize={11}
          fontWeight="600"
          textTransform="uppercase"
        >
          {riskLevel.toUpperCase()} RISK
        </text>
      </svg>
    </div>
  );
}
