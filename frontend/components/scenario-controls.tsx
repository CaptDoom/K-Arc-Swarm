"use client";

import { useEffect, useState } from "react";

import { CustomPolicy, Scenario } from "../lib/types";

export function ScenarioControls({
  scenarios,
  onStart,
  onInject,
  simulationId,
  simulationStatus,
  speedMs,
  onSpeedChange
}: {
  scenarios: Scenario[];
  onStart: (payload: { scenarioId?: string; customPolicy?: CustomPolicy }) => Promise<void>;
  onInject: (payload: { scenarioId?: string; customPolicy?: CustomPolicy }) => Promise<void>;
  simulationId: string | null;
  simulationStatus: string | null;
  speedMs: number;
  onSpeedChange: (value: number) => void;
}) {
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [customPolicy, setCustomPolicy] = useState<CustomPolicy>({
    name: "",
    description: "",
    domain: "economic",
    target_groups: [],
    sentiment_shock: 0,
    trust_shift: 0,
    economic_stress: 0
  });

  useEffect(() => {
    if (!selectedScenario && scenarios.length > 0) {
      setSelectedScenario(scenarios[0].id);
    }
  }, [scenarios, selectedScenario]);

  const canInject = Boolean(simulationId) && simulationStatus === "running";
  const canStart = mode === "preset" ? Boolean(selectedScenario) : Boolean(customPolicy.name.trim());
  const canSubmitCurrentMode = mode === "preset" ? Boolean(selectedScenario) : Boolean(customPolicy.name.trim());

  return (
    <div className="panel p-5">
      <h2 className="mb-1 text-lg font-semibold">Simulation Controls</h2>
      <p className="mb-4 text-sm text-fog">
        Launch a baseline run or inject a new policy into an active simulation after confirmation.
      </p>
      <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-surface/70 p-1 text-sm">
        <button
          onClick={() => setMode("preset")}
          className={`rounded-lg px-3 py-2 ${mode === "preset" ? "bg-accent text-canvas" : "text-fog"}`}
        >
          Preset Scenario
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`rounded-lg px-3 py-2 ${mode === "custom" ? "bg-accent text-canvas" : "text-fog"}`}
        >
          Custom Policy
        </button>
      </div>
      <div className="mb-3 grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="text-xs uppercase tracking-[0.2em] text-fog">Simulation Speed</div>
        <div className="text-xs uppercase tracking-[0.2em] text-fog">Tick Delay</div>
        <div className="rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm text-fog">
          Faster runs make policy effects appear sooner. Slower runs give you more time to inject.
        </div>
        <select
          value={speedMs}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm outline-none"
        >
          <option value={1500}>Slow - 1.5s/tick</option>
          <option value={1000}>Balanced - 1.0s/tick</option>
          <option value={750}>Fast - 0.75s/tick</option>
          <option value={400}>Turbo - 0.4s/tick</option>
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        {mode === "preset" ? (
          <select
            value={selectedScenario}
            onChange={(event) => setSelectedScenario(event.target.value)}
            className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm outline-none"
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={customPolicy.name}
            onChange={(event) => setCustomPolicy((current) => ({ ...current, name: event.target.value }))}
            placeholder="Custom policy name"
            className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm outline-none"
          />
        )}
        <button
          onClick={() =>
            void onStart(
              mode === "preset" ? { scenarioId: selectedScenario } : { customPolicy }
            )
          }
          disabled={!canStart}
          className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mode === "preset" ? "Start Simulation" : "Start With Custom Policy"}
        </button>
        <button
          onClick={() =>
            void onInject(
              mode === "preset" ? { scenarioId: selectedScenario } : { customPolicy }
            )
          }
          disabled={!canInject || !canSubmitCurrentMode}
          className="rounded-xl border border-mint/50 px-4 py-3 text-sm font-semibold text-mint disabled:opacity-40"
        >
          Inject Policy
        </button>
      </div>
      {mode === "custom" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-fog">
            <span>Policy Description</span>
            <input
              value={customPolicy.description}
              onChange={(event) => setCustomPolicy((current) => ({ ...current, description: event.target.value }))}
              placeholder="What does this policy do?"
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-fog">
            <span>Policy Domain</span>
            <input
              value={customPolicy.domain}
              onChange={(event) => setCustomPolicy((current) => ({ ...current, domain: event.target.value }))}
              placeholder="economic, social, infrastructure"
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-fog">
            <span>Target Groups</span>
            <input
              value={customPolicy.target_groups.join(", ")}
              onChange={(event) =>
                setCustomPolicy((current) => ({
                  ...current,
                  target_groups: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                }))
              }
              placeholder="Comma separated occupations or segments"
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-fog">
            <span>Sentiment Shock</span>
            <input
              type="number"
              step="0.01"
              value={customPolicy.sentiment_shock}
              onChange={(event) =>
                setCustomPolicy((current) => ({ ...current, sentiment_shock: Number(event.target.value) }))
              }
              placeholder="-1.0 to 1.0"
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-fog">
            <span>Trust Shift</span>
            <input
              type="number"
              step="0.01"
              value={customPolicy.trust_shift}
              onChange={(event) =>
                setCustomPolicy((current) => ({ ...current, trust_shift: Number(event.target.value) }))
              }
              placeholder="-1.0 to 1.0"
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-fog">
            <span>Economic Stress</span>
            <input
              type="number"
              step="0.01"
              value={customPolicy.economic_stress}
              onChange={(event) =>
                setCustomPolicy((current) => ({ ...current, economic_stress: Number(event.target.value) }))
              }
              placeholder="-1.0 to 1.0"
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        </div>
      ) : null}
      {!canInject ? (
        <p className="mt-3 text-xs text-fog">Start a running simulation before injecting another policy.</p>
      ) : null}
      {mode === "custom" ? (
        <p className="mt-2 text-xs text-fog">
          Custom Policy mode can either start a new run with your own intervention or inject it into a running one.
        </p>
      ) : null}
    </div>
  );
}
