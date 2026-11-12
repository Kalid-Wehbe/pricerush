
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Player = {
  id: string;
  display_name: string;
};

type PlayerSetupProps = {
  onPlayerReady: (player: Player) => void;
};

export default function PlayerSetup({
  onPlayerReady,
}: PlayerSetupProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const displayName = name.trim();

    if (displayName.length < 3 || displayName.length > 20) {
      setError("Your name must be between 3 and 20 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: { user: existingUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      let user = existingUser;

      if (!user) {
        const { data, error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) throw signInError;

        user = data.user;
      }

      if (!user) {
        throw new Error("Could not create your player account.");
      }

      // Check whether this user already has a player profile.
      const { data: existingPlayer, error: lookupError } =
        await supabase
          .from("players")
          .select("id, display_name")
          .eq("id", user.id)
          .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingPlayer) {
        onPlayerReady(existingPlayer);
        return;
      }

      // Create a player without requesting returned columns.
      const { error: insertError } = await supabase
        .from("players")
        .insert({
          id: user.id,
          display_name: displayName,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error(
            "That display name is already taken. Try another."
          );
        }

        throw insertError;
      }

      // Fetch the newly created player using SELECT permissions.
      const { data: player, error: fetchError } = await supabase
        .from("players")
        .select("id, display_name")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      onPlayerReady(player);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4"
    >
      <div>
        <label
          htmlFor="player-name"
          className="mb-2 block text-sm font-medium"
        >
          Choose your display name
        </label>

        <input
          id="player-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a username"
          minLength={3}
          maxLength={20}
          required
          disabled={loading}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-green-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-green-500 px-4 py-3 font-bold text-black transition hover:bg-green-400 disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Continue"}
      </button>
    </form>
  );
}
