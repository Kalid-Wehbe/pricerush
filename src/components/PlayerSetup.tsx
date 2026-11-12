
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
      // Check whether a session already exists.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      let user = session?.user ?? null;

      // No session? Create a new anonymous account.
      if (!user) {
        const { data, error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) throw signInError;

        if (!data.session || !data.user) {
          throw new Error(
            "Anonymous sign-in did not create a session."
          );
        }

        user = data.user;
      } else {
        // Validate the existing session with Supabase.
        const {
          data: { user: verifiedUser },
          error: verificationError,
        } = await supabase.auth.getUser();

        if (verificationError || !verifiedUser) {
          // An existing session may have expired or been revoked.
          // Clear it and create a new anonymous session.
          const { error: signOutError } =
            await supabase.auth.signOut({ scope: "local" });

          if (signOutError) throw signOutError;

          const { data, error: signInError } =
            await supabase.auth.signInAnonymously();

          if (signInError) throw signInError;

          if (!data.session || !data.user) {
            throw new Error(
              "Could not restore your player session."
            );
          }

          user = data.user;
        } else {
          user = verifiedUser;
        }
      }

      // Look up an existing player profile.
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

      // Create a new player profile.
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

      // Fetch the newly created player profile.
      const { data: player, error: fetchError } =
        await supabase
          .from("players")
          .select("id, display_name")
          .eq("id", user.id)
          .single();

      if (fetchError) throw fetchError;

      onPlayerReady(player);
    } catch (err) {
      console.error("Player setup failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
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
