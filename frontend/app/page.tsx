"use client";

import { useEffect, useMemo, useState } from "react";
import useWebSocket from "react-use-websocket";

import { ComparisonTable } from "../components/comparison-table";
import { ConfirmModal } from "../components/confirm-modal";
import { EventTimeline } from "../components/event-timeline";
import { HeatmapCanvas } from "../components/heatmap-canvas";
import { NetworkClusters } from "../components/network-clusters";
import { ScenarioControls } from "../components/scenario-controls";
import { SentimentChart } from "../components/sentiment-chart";
import { fetchComparison, fetchScenarios, fetchSimulation, injectScenario, startSimulation } from "../lib/api";
import { CustomPolicy, Scenario, ScenarioComparison, Snapshot } from "../lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export default function HomePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [comparison, setComparison] = useState<ScenarioComparison[]>([]);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [tickDelayMs, setTickDelayMs] = useState<number>(1000);
  const [pendingAction, setPendingAction] = useState<
    | {
        type: "start" | "inject";
        payload: { scenarioId?: string; customPolicy?: CustomPolicy };
      }
    | null
  >(null);
  const [timeline, setTimeline] = useState<{ ticks: number[]; sentiment: number[]; trust: number[] }>({
    ticks: [],
    sentiment: [],
    trust: []
  });

  const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectAttempts: 20,
    reconnectInterval: 1000
  });

  useEffect(() => {
    async function load() {
      const [scenarioRows, comparisonRows] = await Promise.all([fetchScenarios(), fetchComparison()]);
      setScenarios(scenarioRows);
      setComparison(comparisonRows);
    }

    void load();
  }, []);

  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    const parsed = JSON.parse(lastMessage.data) as Snapshot | { type: string; payload: unknown };
    if ("simulation_id" in parsed) {
      setSnapshot(parsed);
      setTimeline((current) => ({
        ticks: current.ticks.at(-1) === parsed.metrics.tick ? current.ticks : [...current.ticks, parsed.metrics.tick],
        sentiment:
          current.ticks.at(-1) === parsed.metrics.tick
            ? current.sentiment
            : [...current.sentiment, parsed.metrics.sentiment_mean],
        trust: current.ticks.at(-1) === parsed.metrics.tick ? current.trust : [...current.trust, parsed.metrics.trust_mean]
      }));
      if (parsed.status === "completed") {
        setActionMessage("Simulation completed. Start a new run to test another injection sequence.");
      }
      return;
    }

    if ("type" in parsed && parsed.type === "policy_injected") {
      const payload = parsed.payload as { scenario_id?: string; tick?: number };
      if (payload.scenario_id && typeof payload.tick === "number") {
        setActionMessage(`Policy "${payload.scenario_id}" confirmed for tick ${payload.tick}.`);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (readyState === 1) {
      sendMessage("dashboard-online");
    }
  }, [readyState, sendMessage]);

  async function runStart(payload: { scenarioId?: string; customPolicy?: CustomPolicy }) {
    const label = payload.customPolicy?.name || payload.scenarioId;
    if (!label) {
      setActionMessage("Choose a preset scenario or enter a custom policy before starting.");
      return;
    }
    const response = await startSimulation({
      name: "Delhi policy lab",
      scenario_id: payload.scenarioId,
      custom_policy: payload.customPolicy,
      agent_count: 1000,
      tick_hours: 6,
      total_ticks: 48,
      tick_delay_ms: tickDelayMs
    });
    setSimulationId(response.simulation_id);
    const initial = await fetchSimulation(response.simulation_id);
    setSnapshot(initial);
    setTimeline({
      ticks: [initial.metrics.tick],
      sentiment: [initial.metrics.sentiment_mean],
      trust: [initial.metrics.trust_mean]
    });
    setActionMessage(
      `Simulation started with "${label}" at ${tickDelayMs}ms per tick. You can now monitor progress and inject another policy while it is running.`
    );
  }

  async function runInject(payload: { scenarioId?: string; customPolicy?: CustomPolicy }) {
    if (!simulationId || !snapshot) {
      return;
    }
    const label = payload.customPolicy?.name || payload.scenarioId;
    if (!label) {
      setActionMessage("Choose a preset scenario or enter a custom policy.");
      return;
    }
    try {
      const result = await injectScenario(simulationId, {
        scenario_id: payload.scenarioId,
        custom_policy: payload.customPolicy,
        tick: snapshot.metrics.tick + 1
      });
      setActionMessage(`Policy "${label}" scheduled for tick ${result.tick}.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Failed to inject policy.");
    }
  }

  async function handleStart(payload: { scenarioId?: string; customPolicy?: CustomPolicy }) {
    setPendingAction({ type: "start", payload });
  }

  async function handleInject(payload: { scenarioId?: string; customPolicy?: CustomPolicy }) {
    setPendingAction({ type: "inject", payload });
  }

  const pendingLabel = pendingAction?.payload.customPolicy?.name || pendingAction?.payload.scenarioId || "policy";
  const pendingTick = snapshot ? snapshot.current_tick + 1 : 0;
  const pendingDetails = useMemo(() => {
    if (!pendingAction) {
      return [];
    }
    const custom = pendingAction.payload.customPolicy;
    if (pendingAction.type === "start") {
      return [
        { label: "Mode", value: custom ? "Custom policy start" : "Preset scenario start" },
        { label: "Scenario", value: pendingLabel },
        { label: "Speed", value: `${tickDelayMs} ms per tick` },
        { label: "Duration", value: "48 ticks" }
      ];
    }
    return [
      { label: "Action", value: "Inject into running simulation" },
      { label: "Policy", value: pendingLabel },
      { label: "Scheduled Tick", value: pendingTick },
      { label: "Domain", value: custom?.domain || "preset scenario" }
    ];
  }, [pendingAction, pendingLabel, pendingTick, tickDelayMs]);

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    setPendingAction(null);
    if (action.type === "start") {
      await runStart(action.payload);
      return;
    }
    await runInject(action.payload);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <ConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.type === "start" ? `Start "${pendingLabel}"?` : `Inject "${pendingLabel}"?`}
        description={
          pendingAction?.type === "start"
            ? "Review the setup for this simulation run before launching it."
            : "Review this intervention before sending it into the active simulation."
        }
        details={pendingDetails}
        confirmLabel={pendingAction?.type === "start" ? "Start Run" : "Inject Policy"}
        onConfirm={() => void confirmPendingAction()}
        onCancel={() => {
          if (pendingAction) {
            setActionMessage(
              pendingAction.type === "start"
                ? `Start for "${pendingLabel}" was cancelled.`
                : `Policy "${pendingLabel}" was not injected.`
            );
          }
          setPendingAction(null);
        }}
      />
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="panel p-7">
          <div className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-accent">
            Policy Intelligence Dashboard
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">
            K-ARK NationSim turns clustered citizens into a living model of Delhi&apos;s policy response.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-fog">
            Run a scenario, stream sentiment shifts, inspect opinion clusters, and estimate protest risk through a
            digital twin of urban society.
          </p>
        </div>
        <div className="panel p-7">
          <div className="text-sm uppercase tracking-[0.2em] text-fog">Connection Status</div>
          <div className="mt-4 text-3xl font-semibold">
            {readyState === 1 ? "Connected" : readyState === 0 ? "Connecting" : "Reconnecting"}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface/70 p-4">
              <div className="text-sm text-fog">Simulation</div>
              <div className="mt-2 text-lg font-semibold">{snapshot?.status ?? "idle"}</div>
            </div>
            <div className="rounded-xl bg-surface/70 p-4">
              <div className="text-sm text-fog">Forecast Confidence</div>
              <div className="mt-2 text-lg font-semibold">
                {snapshot ? `${Math.round(snapshot.metrics.forecast.confidence * 100)}%` : "--"}
              </div>
            </div>
            <div className="rounded-xl bg-surface/70 p-4 col-span-2">
              <div className="text-sm text-fog">Active Speed</div>
              <div className="mt-2 text-lg font-semibold">
                {snapshot ? `${snapshot.tick_delay_ms} ms/tick` : `${tickDelayMs} ms/tick`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <ScenarioControls
          scenarios={scenarios}
          onStart={handleStart}
          onInject={handleInject}
          simulationId={simulationId}
          simulationStatus={snapshot?.status ?? null}
          speedMs={tickDelayMs}
          onSpeedChange={setTickDelayMs}
        />

        {actionMessage ? (
          <div className="rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm text-fog">
            {actionMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="panel p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-fog">Progress</div>
            <div className="mt-3 text-4xl font-semibold">
              {snapshot ? `${snapshot.current_tick + 1}/${snapshot.total_ticks}` : "--"}
            </div>
            <div className="mt-3 h-2 rounded-full bg-surface/80">
              <div
                className="h-2 rounded-full bg-mint"
                style={{
                  width: snapshot ? `${((snapshot.current_tick + 1) / snapshot.total_ticks) * 100}%` : "0%"
                }}
              />
            </div>
          </div>
          <div className="panel p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-fog">Mean Sentiment</div>
            <div className="mt-3 text-4xl font-semibold">{snapshot?.metrics.sentiment_mean.toFixed(2) ?? "--"}</div>
          </div>
          <div className="panel p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-fog">Protest Risk</div>
            <div className="mt-3 text-4xl font-semibold">{snapshot?.metrics.protest_risk.toFixed(2) ?? "--"}</div>
          </div>
          <div className="panel p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-fog">Acceptance Rate</div>
            <div className="mt-3 text-4xl font-semibold">
              {snapshot ? `${Math.round(snapshot.metrics.acceptance_rate * 100)}%` : "--"}
            </div>
          </div>
        </div>

        <SentimentChart ticks={timeline.ticks} sentiment={timeline.sentiment} trust={timeline.trust} />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <HeatmapCanvas points={snapshot?.metrics.heatmap ?? []} />
          <div className="grid gap-6">
            <NetworkClusters clusters={snapshot?.metrics.cluster_summary ?? []} />
            <div className="panel p-5">
              <h2 className="mb-1 text-lg font-semibold">Realtime Narrative</h2>
              <p className="mb-4 text-sm text-fog">
                {snapshot?.metrics.forecast.insight ?? "Start a simulation to generate insight."}
              </p>
              <div className="rounded-xl bg-surface/70 px-4 py-4 text-sm text-fog">
                The system is tracking agent mood, trust, and policy propagation live. Use the timeline below to review
                exactly when interventions were scheduled and applied.
              </div>
            </div>
          </div>
        </div>

        <EventTimeline items={snapshot?.metrics.event_log ?? []} />

        <ComparisonTable rows={comparison} />
      </section>
    </main>
  );
}
