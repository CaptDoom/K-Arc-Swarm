"use client";

import { ScenarioComparison } from "../lib/types";

export function ComparisonTable({ rows }: { rows: ScenarioComparison[] }) {
  return (
    <div className="panel p-5">
      <h2 className="mb-1 text-lg font-semibold">Scenario Comparison</h2>
      <p className="mb-4 text-sm text-fog">Quick view of likely sentiment and protest outcomes.</p>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface/80 text-fog">
            <tr>
              <th className="px-4 py-3">Scenario</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Protest Risk</th>
              <th className="px-4 py-3">Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scenario_id} className="border-t border-white/10">
                <td className="px-4 py-3">{row.scenario_id}</td>
                <td className="px-4 py-3">{row.sentiment_mean.toFixed(2)}</td>
                <td className="px-4 py-3">{row.protest_risk.toFixed(2)}</td>
                <td className="px-4 py-3">{row.acceptance_rate.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
