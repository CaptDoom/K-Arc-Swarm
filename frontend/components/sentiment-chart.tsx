"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export function SentimentChart({
  ticks,
  sentiment,
  trust
}: {
  ticks: number[];
  sentiment: number[];
  trust: number[];
}) {
  return (
    <div className="panel p-5">
      <h2 className="mb-1 text-lg font-semibold">Sentiment Trajectory</h2>
      <p className="mb-4 text-sm text-fog">Overall public mood and trust over time.</p>
      <Line
        data={{
          labels: ticks,
          datasets: [
            {
              label: "Sentiment",
              data: sentiment,
              borderColor: "#53d3a1",
              backgroundColor: "rgba(83, 211, 161, 0.16)",
              tension: 0.35,
              fill: true
            },
            {
              label: "Trust",
              data: trust,
              borderColor: "#f1b24a",
              backgroundColor: "rgba(241, 178, 74, 0.08)",
              tension: 0.35
            }
          ]
        }}
        options={{
          responsive: true,
          plugins: {
            legend: {
              labels: { color: "#d8e5f0" }
            }
          },
          scales: {
            x: {
              ticks: { color: "#a8bdd1" },
              grid: { color: "rgba(255,255,255,0.06)" }
            },
            y: {
              min: -1,
              max: 1,
              ticks: { color: "#a8bdd1" },
              grid: { color: "rgba(255,255,255,0.06)" }
            }
          }
        }}
      />
    </div>
  );
}
