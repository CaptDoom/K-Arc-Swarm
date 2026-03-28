"use client";

import { ClusterSummary } from "../lib/types";

export function NetworkClusters({ clusters }: { clusters: ClusterSummary[] }) {
  return (
    <div className="panel p-5">
      <h2 className="mb-1 text-lg font-semibold">Opinion Clusters</h2>
      <p className="mb-4 text-sm text-fog">Representative groups inferred from sentiment and ideology vectors.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {clusters.map((cluster) => (
          <div key={cluster.cluster} className="rounded-xl border border-white/10 bg-surface/70 p-4">
            <div className="text-sm uppercase tracking-[0.2em] text-accent">Cluster {cluster.cluster}</div>
            <div className="mt-3 text-2xl font-semibold">{cluster.size}</div>
            <div className="mt-2 text-sm text-fog">Dominant occupation: {cluster.dominant_occupation}</div>
            <div className="mt-3 text-sm">Mean sentiment: {cluster.mean_sentiment.toFixed(2)}</div>
            <div className="text-sm">Mean trust: {cluster.mean_trust.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
