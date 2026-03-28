import { CustomPolicy, Scenario, ScenarioComparison, Snapshot } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function fetchScenarios(): Promise<Scenario[]> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios`, { cache: "no-store" });
  return response.json();
}

export async function fetchComparison(): Promise<ScenarioComparison[]> {
  const response = await fetch(`${API_BASE_URL}/api/compare`, { cache: "no-store" });
  return response.json();
}

export async function startSimulation(payload: {
  name: string;
  scenario_id?: string;
  custom_policy?: CustomPolicy;
  agent_count: number;
  tick_hours: number;
  total_ticks: number;
  tick_delay_ms: number;
}): Promise<{ simulation_id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/simulations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function fetchSimulation(simulationId: string): Promise<Snapshot> {
  const response = await fetch(`${API_BASE_URL}/api/simulations/${simulationId}`, { cache: "no-store" });
  return response.json();
}

export async function injectScenario(
  simulationId: string,
  payload: { scenario_id?: string; custom_policy?: CustomPolicy; tick: number }
): Promise<{ status: string; tick: number }> {
  const response = await fetch(`${API_BASE_URL}/api/simulations/${simulationId}/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail ?? "Failed to inject scenario");
  }
  return response.json();
}
