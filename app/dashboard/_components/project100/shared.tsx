"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import type { ImpactTotals, ImpactView } from "@/lib/project100/impact/types";
import { impactMoney } from "@/lib/project100/impact/types";

export async function impactRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : "That did not go through. Please try again.",
    );
  return body;
}
export function useImpact(groupId?: string, admin = false) {
  const endpoint = admin
    ? "/api/admin/project100/impact"
    : "/api/member/project100/impact";
  const key = `${endpoint}${groupId ? `?group=${encodeURIComponent(groupId)}` : ""}`;
  const [state, setState] = useState<{
    key: string;
    view: ImpactView | null;
    error: string;
    loading: boolean;
  }>({ key, view: null, error: "", loading: true });
  const generation = useRef(0);
  const fetchView = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++generation.current;
      try {
        const result = await impactRequest(key, { signal });
        if (generation.current === current && !signal?.aborted)
          setState({ key, view: result, error: "", loading: false });
      } catch (cause) {
        if (generation.current === current && !signal?.aborted)
          setState((previous) => ({
            key,
            view: previous.key === key ? previous.view : null,
            error:
              cause instanceof Error
                ? cause.message
                : "Project100 could not load.",
            loading: false,
          }));
      }
    },
    [key],
  );
  useEffect(() => {
    const controller = new AbortController();
    void fetchView(controller.signal);
    return () => controller.abort();
  }, [fetchView]);
  const reload = useCallback(async () => {
    setState((previous) => ({
      key,
      view: previous.key === key ? previous.view : null,
      error: "",
      loading: true,
    }));
    await fetchView();
  }, [key, fetchView]);
  return {
    view: state.key === key ? state.view : null,
    error: state.key === key ? state.error : "",
    loading: state.key !== key || state.loading,
    reload,
  };
}
export function Totals({
  value,
  className = "",
}: {
  value: ImpactTotals;
  className?: string;
}) {
  const primary = value.NGN === 0 && value.USD !== 0 ? "USD" : "NGN";
  return (
    <span className={`p100-totals ${className}`}>
      <span>{impactMoney(value[primary], primary)}</span>
      {primary === "NGN" && value.USD !== 0 && (
        <span className="p100-usd">{impactMoney(value.USD, "USD")}</span>
      )}
    </span>
  );
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="p100-notice" role="alert">
        <p>{error}</p>
        <button className="p100-secondary" onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  return loading ? (
    <div className="p100-loading" role="status">
      <LoaderCircle
        size={20}
        className="animate-spin motion-reduce:animate-none"
      />
      Loading your community’s impact…
    </div>
  ) : null;
}
export function Progress({
  raised,
  target,
  label,
}: {
  raised: number;
  target: number;
  label: string;
}) {
  const percent =
    target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  return (
    <div
      className="p100-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
