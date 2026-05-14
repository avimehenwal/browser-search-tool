"use client";

import React, { useEffect, useState } from "react";

type Props = {
  title: string;
  /** Return a number or a Promise<number> */
  getCount?: () => Promise<number> | number;
  /** If provided, display this value instead of polling getCount */
  value?: number | null;
  refreshMs?: number;
  subtitle?: React.ReactNode;
  className?: string;
};

export default function BigMetric({
  title,
  getCount,
  value,
  refreshMs = 1000,
  subtitle,
  className = "",
}: Props) {
  const [count, setCount] = useState<number | null>(
    typeof value === "number" ? value : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof value === "number") {
      setCount(value);
      return;
    }
    let mounted = true;
    let id: number | undefined;
    const update = async () => {
      if (!getCount) return;
      try {
        setLoading(true);
        const res = await Promise.resolve(getCount());
        if (!mounted) return;
        setCount(typeof res === "number" ? res : null);
      } catch {
        if (!mounted) return;
        setCount(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    // initial
    void update();
    id = window.setInterval(() => void update(), refreshMs);
    return () => {
      mounted = false;
      if (id) clearInterval(id);
    };
  }, [getCount, value, refreshMs]);

  const formatted =
    typeof count === "number" ? new Intl.NumberFormat().format(count) : "—";

  return (
    <div
      className={`border rounded-lg p-4 bg-background text-foreground ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-2 text-3xl md:text-4xl font-semibold font-mono">
            {formatted}
          </div>
          {subtitle ? (
            <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
          ) : null}
        </div>
        <div className="text-sm text-muted-foreground self-start">
          {loading ? "updating..." : ""}
        </div>
      </div>
    </div>
  );
}
