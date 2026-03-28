"use client";

type TimelineEntry = {
  id: string;
  tick: number | null;
  title: string;
  detail: string;
  state: "scheduled" | "applied" | "info";
};

function parseEventLogItem(item: string, index: number): TimelineEntry {
  const scheduledMatch = item.match(/^Scheduled (.+) for tick (\d+)\.$/);
  if (scheduledMatch) {
    return {
      id: `${index}-${item}`,
      tick: Number(scheduledMatch[2]),
      title: "Policy Scheduled",
      detail: scheduledMatch[1],
      state: "scheduled"
    };
  }

  const appliedMatch = item.match(/^Tick (\d+): applied (.+)\.$/);
  if (appliedMatch) {
    return {
      id: `${index}-${item}`,
      tick: Number(appliedMatch[1]),
      title: "Policy Applied",
      detail: appliedMatch[2],
      state: "applied"
    };
  }

  return {
    id: `${index}-${item}`,
    tick: null,
    title: "Simulation Update",
    detail: item,
    state: "info"
  };
}

const stateStyles: Record<TimelineEntry["state"], string> = {
  scheduled: "border-accent/30 bg-accent/10 text-accent",
  applied: "border-mint/30 bg-mint/10 text-mint",
  info: "border-white/10 bg-surface/70 text-fog"
};

export function EventTimeline({ items }: { items: string[] }) {
  const entries = items.map(parseEventLogItem).reverse();

  return (
    <div className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Policy Timeline</h2>
        <div className="text-xs uppercase tracking-[0.2em] text-fog">Recent Interventions</div>
      </div>
      <p className="mb-4 text-sm text-fog">
        Scheduled and applied policies appear here so you can follow intervention history over time.
      </p>
      <div className="space-y-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-white/10 bg-surface/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{entry.title}</div>
                  <div className="mt-1 text-sm text-fog">{entry.detail}</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${stateStyles[entry.state]}`}>
                  {entry.tick !== null ? `Tick ${entry.tick}` : entry.state}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-surface/50 p-4 text-sm text-fog">
            Start a simulation and inject policies to populate this timeline.
          </div>
        )}
      </div>
    </div>
  );
}
