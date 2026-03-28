export type Scenario = {
  id: string;
  name: string;
  description: string;
  domain: string;
  parameters: Record<string, unknown>;
};

export type CustomPolicy = {
  name: string;
  description: string;
  domain: string;
  target_groups: string[];
  sentiment_shock: number;
  trust_shift: number;
  economic_stress: number;
};

export type HeatPoint = {
  lat: number;
  lng: number;
  sentiment: number;
  trust: number;
  weight: number;
};

export type ClusterSummary = {
  cluster: number;
  size: number;
  mean_sentiment: number;
  mean_trust: number;
  dominant_occupation: string;
};

export type Snapshot = {
  simulation_id: string;
  status: string;
  name: string;
  current_tick: number;
  total_ticks: number;
  tick_hours: number;
  tick_delay_ms: number;
  metrics: {
    tick: number;
    sentiment_mean: number;
    trust_mean: number;
    economic_mean: number;
    protest_risk: number;
    cohesion: number;
    acceptance_rate: number;
    sentiment_band: {
      positive: number;
      neutral: number;
      negative: number;
    };
    heatmap: HeatPoint[];
    event_log: string[];
    forecast: {
      next_tick_sentiment: number;
      confidence: number;
      insight: string;
    };
    cluster_summary: ClusterSummary[];
  };
};

export type ScenarioComparison = {
  scenario_id: string;
  sentiment_mean: number;
  protest_risk: number;
  acceptance_rate: number;
};
