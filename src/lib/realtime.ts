"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeHandler<T> = (payload: T) => void;

export function subscribeToTable<T>(
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  handler: RealtimeHandler<{ new: T; old: T | null; eventType: string }>,
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`realtime-${table}-${event}`)
    .on("postgres_changes", { event, schema: "public", table }, (payload) => {
      handler({
        new: payload.new as T,
        old: (payload.old as T) ?? null,
        eventType: payload.eventType,
      });
    })
    .subscribe();
}

export function subscribePresence(
  room: string,
  onJoin: (key: string) => void,
  onLeave: (key: string) => void,
  onSync: (keys: string[]) => void,
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase.channel(`presence-${room}`, {
    config: { presence: { key: "" } },
  });
  channel
    .on("presence", { event: "join" }, ({ key }) => onJoin(key as string))
    .on("presence", { event: "leave" }, ({ key }) => onLeave(key as string))
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      onSync(Object.keys(state));
    });
  return channel;
}
