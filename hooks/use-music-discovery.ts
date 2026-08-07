"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomLaunchQuery } from "@/data/launch-seeds";
import type { Album, DiscoveryResponse } from "@/types/music";

async function requestDiscovery(query: string, signal: AbortSignal): Promise<DiscoveryResponse> {
  const response = await fetch(`/api/spotify?q=${encodeURIComponent(query)}`, {
    signal,
    cache: "no-store",
  });
  const data = (await response.json()) as DiscoveryResponse;
  if (!response.ok) throw new Error(data.error || "Spotify search failed.");
  return data;
}

export function useMusicDiscovery() {
  const [tracks, setTracks] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const launched = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  const discover = useCallback(async (query: string, fallbackMessage = "Spotify search failed.") => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError("");
    setWarning("");

    try {
      const data = await requestDiscovery(query, controller.signal);
      if (activeRequest.current !== controller) return false;
      setTracks(data.tracks ?? []);
      setWarning(data.warning ?? "");
      return true;
    } catch (reason) {
      if (controller.signal.aborted) return false;
      setError(reason instanceof Error ? reason.message : fallbackMessage);
      return false;
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    void discover(randomLaunchQuery(), "Could not load the launch track.");
    return () => activeRequest.current?.abort();
  }, [discover]);

  return { tracks, loading, error, warning, discover };
}
