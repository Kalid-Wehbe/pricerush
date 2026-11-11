
import { supabase } from "./supabase";

export type GameState = {
  attempt_id: string;
  current_position: number;
  current_product_started_at: string;
  completed_at: string | null;
  total_score: number | string;
  product_id: string | null;
  product_name: string | null;
  product_image_url: string | null;
  product_url: string | null;
  currency: string | null;
};

export type LeaderboardEntry = {
  player_rank: number;
  display_name: string;
  total_score: number | string;
  completed_at: string;
};

export async function startDailyAttempt() {
  const { data, error } = await supabase.rpc("start_daily_attempt");

  if (error) throw error;

  return data?.[0] ?? null;
}

export async function getDailyGameState() {
  const { data, error } = await supabase.rpc("get_daily_game_state");

  if (error) throw error;

  return data?.[0] as GameState | undefined;
}

export async function submitDailyGuess(
  position: number,
  guess: number | null
) {
  const { data, error } = await supabase.rpc("submit_daily_guess", {
    p_position: position,
    p_guess: guess,
  });

  if (error) throw error;

  return data?.[0] ?? null;
}

export async function getDailyLeaderboard() {
  const { data, error } = await supabase.rpc("get_daily_leaderboard");

  if (error) throw error;

  return (data ?? []) as LeaderboardEntry[];
}
