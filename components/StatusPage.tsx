import React, { useEffect, useMemo, useState } from "react";
import { ServiceStatus, StatusGroup, StatusPayload } from "../types";

// ---------- Utilities ----------
const cls = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");

function statusColor(overall: string) {
  switch (overall) {
    case "operational":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
    case "degraded":
      return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
    case "partial_outage":
      return "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30";
    default:
      return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
  }
}

function pctBadgeColor(pct: number) {
  if (pct >= 99.9) return "bg-emerald-600";
  if (pct >= 99.0) return "bg-emerald-500";
  if (pct >= 97.0) return "bg-amber-500";
  if (pct >= 90.0) return "bg-orange-500";
  return "bg-rose-600";
}

function fmtAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
}

// ---------- Demo data (used if /api/status is unavailable) ----------
const demo: StatusPayload = {
  overall: "operational",
  updatedAt: new Date().toISOString(),
  refreshSec: 60,
  groups: [
    {
      name: "Services",
      services: [
        demoService("main", "Main Site", 99.86),
        demoService("api", "API", 100.0),
      ],
    },
    {
      name: "Auxiliary Service",
      services: [
        demoService("search", "Search", 100.0),
        demoService("ingest", "Image Ingestion", 100.0),
        demoService("img-delivery", "Image Delivery", 100.0),
        demoService("file-scanner", "File Scanner", 100.0),
        demoService("file-delivery", "File Delivery", 100.0),
        demoService("jobs", "Job Subsystem", 100.0),
        demoService("links", "Link Service", 100.0),
        demoService("discord", "Discord Model Announcements", 100.0),
        demoService("signal", "Signal Service", 100.0),
      ],
    },
  ],
};

function demoService(id: string, name: string, pct: number): ServiceStatus {
  const history = Array.from({ length: 60 }, (_, i) => (i % 31 === 0 ? 0 : 1)) as Array<0|1>;
  return {
    id,
    name,
    statusPct: pct,
    lastCheck: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    history,
    latencyMs: Math.round(80 + Math.random() * 30),
  };
}

// ---------- Hooks ----------
function useStatus(endpoint = "/api/status", fallback = demo) {
  const [data, setData] = useState<StatusPayload>(fallback);
  const [error, setError] = useState<string | null>(null);

  const refreshSec = data?.refreshSec ?? 60;

  useEffect(() => {
    let alive = true;

    async function fetchOnce() {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = (await res.json()) as StatusPayload;
        if (alive) setData(json);
      } catch (e: any) {
        // stay on fallback demo but surface error
        if (alive) setError(e?.message || "Failed to fetch status");
      }
    }

    fetchOnce();
    const id = setInterval(fetchOnce, refreshSec * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [endpoint, refreshSec]);

  return { data, error };
}

// ---------- Tiny Sparkline (bar sequence) ----------
function Sparkline({ history }: { history: Array<0 | 1> }) {
  return (
    <div className="grid grid-flow-col auto-cols-[6px] gap-[3px] items-end justify-start">
      {history.map((v, i) => (
        <div
          key={i}
          className={cls(
            "h-3 w-[6px] rounded-sm",
            v ? "bg-emerald-400/80" : "bg-rose-500/80"
          )}
        />
      ))}
    </div>
  );
}

// ---------- Service Row ----------
// FIX: Refactored to React.FC to resolve potential issues with TypeScript's JSX type checking where the 'key' prop was incorrectly being assigned to the component's props.
const ServiceRow: React.FC<{ s: ServiceStatus }> = ({ s }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 rounded-xl bg-neutral-900/40 ring-1 ring-white/5">
      <div className="flex items-center gap-3">
        <span className={cls("text-[10px] font-medium text-white px-2 py-1 rounded-md", pctBadgeColor(s.statusPct))}>
          {s.statusPct.toFixed(2)}%
        </span>
        <div className="text-sm text-neutral-200">{s.name}</div>
      </div>
      <div className="mt-2 sm:mt-0 flex items-center gap-6">
        <div className="hidden md:block text-xs text-neutral-400">
          {s.latencyMs ? `${s.latencyMs} ms` : ""}
        </div>
        <div className="text-xs text-neutral-400">{fmtAgo(s.lastCheck)}</div>
        <Sparkline history={s.history} />
      </div>
    </div>
  );
};

// ---------- Group Card ----------
// FIX: Refactored to React.FC to resolve potential issues with TypeScript's JSX type checking where the 'key' prop was incorrectly being assigned to the component's props.
const GroupCard: React.FC<{ g: StatusGroup }> = ({ g }) => {
  return (
    <div className="rounded-2xl bg-neutral-900/60 ring-1 ring-white/10 p-4 sm:p-6 space-y-3">
      <div className="text-neutral-300 font-medium tracking-wide">{g.name}</div>
      <div className="space-y-2">
        {g.services.map((s) => (
          <ServiceRow key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export default function StatusPage() {
  const { data, error } = useStatus();
  const bannerCopy = useMemo(() => {
    switch (data.overall) {
      case "operational":
        return "All Systems Operational";
      case "degraded":
        return "Performance Degraded";
      case "partial_outage":
        return "Partial Outage";
      default:
        return "Major Outage";
    }
  }, [data.overall]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-500 grid place-items-center font-black text-neutral-900">S</div>
          <div>
            <div className="text-xl font-semibold">Status</div>
            <div className="text-xs text-neutral-400">Live service health</div>
          </div>
        </div>

        {/* Banner */}
        <div className={cls("flex items-center gap-3 rounded-2xl px-4 py-3", statusColor(data.overall))}>
          <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
          <div className="text-sm font-medium">{bannerCopy}</div>
          <div className="ml-auto text-xs opacity-75">Last updated: {new Date(data.updatedAt).toLocaleString()}</div>
        </div>

        {/* Groups */}
        <div className="grid grid-cols-1 gap-4">
          {data.groups.map((g, i) => (
            <GroupCard key={i} g={g} />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-neutral-500 pt-2">
          Refresh in {data.refreshSec}s {error && <span className="text-rose-400">• {error}</span>}
        </div>
      </div>
    </div>
  );
}
