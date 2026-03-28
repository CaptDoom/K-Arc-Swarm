"use client";

import { useEffect, useRef } from "react";

import { HeatPoint } from "../lib/types";

export function HeatmapCanvas({ points }: { points: HeatPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#07131f";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const point of points) {
      const x = ((point.lng - 76.9) / 0.7) * canvas.width;
      const y = canvas.height - ((point.lat - 28.3) / 0.5) * canvas.height;
      const radius = 4 + point.weight;
      const red = point.sentiment < 0 ? 241 : 83;
      const green = point.sentiment < 0 ? 111 : 211;
      const blue = point.sentiment < 0 ? 121 : 161;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.35)`;
      context.fill();
    }
  }, [points]);

  return (
    <div className="panel p-5">
      <h2 className="mb-1 text-lg font-semibold">Delhi Sentiment Heatmap</h2>
      <p className="mb-4 text-sm text-fog">Higher intensity indicates stronger regional response.</p>
      <canvas ref={canvasRef} width={700} height={320} className="h-80 w-full rounded-xl border border-white/10" />
    </div>
  );
}
