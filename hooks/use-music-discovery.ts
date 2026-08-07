"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomLaunchQuery } from "@/data/launch-seeds";
import type { Album, DiscoveryResponse } from "@/types/music";

async function requestDiscovery(params: URLSearchParams, signal: AbortSignal): Promise<DiscoveryResponse> {
  const response = await fetch(`/api/spotify?${params}`, { signal });
  const data = (await response.json()) as DiscoveryResponse;
  if (!response.ok) throw new Error(data.error || "Spotify search failed.");
  return data;
}

export function useMusicDiscovery() {
  const [tracks, setTracks] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const launched = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  const beginRequest = useCallback(() => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setPreviewing(false);
    setError("");
    setWarning("");

    return controller;
  }, []);

  const finishRequest = useCallback((controller: AbortController) => {
    if (activeRequest.current === controller) {
      activeRequest.current = null;
      setLoading(false);
    }
  }, []);

  const discover = useCallback(async (query: string, fallbackMessage = "Spotify search failed.") => {
    const controller = beginRequest();

    try {
      const previewParams = new URLSearchParams({ q: query, preview: "1" });
      const preview = await requestDiscovery(previewParams, controller.signal);
      if (activeRequest.current !== controller) return false;
      setTracks(preview.tracks ?? []);
      setPreviewing(true);

      if (!preview.seedId) throw new Error("Spotify did not return a track ID.");
      const fullParams = new URLSearchParams({ seedId: preview.seedId });
      const data = await requestDiscovery(fullParams, controller.signal);
      if (activeRequest.current !== controller) return false;
      setTracks(data.tracks ?? []);
      setWarning(data.warning ?? "");
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (activeRequest.current === controller) setPreviewing(false);
      return true;
    } catch (reason) {
      if (controller.signal.aborted) return false;
      setPreviewing(false);
      setError(reason instanceof Error ? reason.message : fallbackMessage);
      return false;
    } finally {
      finishRequest(controller);
    }
  }, [beginRequest, finishRequest]);

  const discoverBySeedId = useCallback(async (seedId: string) => {
    const controller = beginRequest();
    try {
      const data = await requestDiscovery(new URLSearchParams({ seedId }), controller.signal);
      if (activeRequest.current !== controller) return false;
      setTracks(data.tracks ?? []);
      setWarning(data.warning ?? "");
      return true;
    } catch (reason) {
      if (controller.signal.aborted) return false;
      setError(reason instanceof Error ? reason.message : "Could not load this track’s neighbors.");
      return false;
    } finally {
      finishRequest(controller);
    }
  }, [beginRequest, finishRequest]);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    void discover(randomLaunchQuery(), "Could not load the launch track.");
    return () => activeRequest.current?.abort();
  }, [discover]);

  return { tracks, loading, previewing, error, warning, discover, discoverBySeedId };
}
