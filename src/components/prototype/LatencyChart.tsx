"use client";

type Props = {
  data: number[];
  className?: string;
  height?: number;
};

export default function LatencyChart({
  data,
  className = "",
  height = 56,
}: Props) {
  const points = (data || []).slice(-50); // last 50
  const len = points.length;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);

  const coords = points.map((v, i) => {
    const x = len > 1 ? (i / (len - 1)) * 100 : 50;
    const y = 100 - ((v - min) / (max - min || 1)) * 100;
    return { x, y };
  });

  const pathD = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaD = coords.length ? `${pathD} L 100 100 L 0 100 Z` : "";

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full text-foreground"
      >
        {areaD ? <path d={areaD} fill="currentColor" opacity="0.04" /> : null}
        {pathD ? (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
    </div>
  );
}
