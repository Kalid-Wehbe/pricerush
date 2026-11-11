
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Clock3, Trophy, ArrowRight, Loader2 } from "lucide-react";
import {
  startDailyAttempt,
  getDailyGameState,
  submitDailyGuess,
  type GameState,
} from "../lib/game";

export default function GameScreen() {
  const [game, setGame] = useState<GameState | null>(null);
  const [guess, setGuess] = useState("");
  const [remaining, setRemaining] = useState(15);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const submittingRef = useRef(false);
  const autoSubmittedPosition = useRef<number | null>(null);

  useEffect(() => {
    async function loadGame() {
      try {
        await startDailyAttempt();

        const state = await getDailyGameState();

        if (!state) {
          throw new Error("Could not load your game.");
        }

        setGame(state);

        if (state.completed_at) {
          setFinalScore(Number(state.total_score));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not start the game."
        );
      } finally {
        setLoading(false);
      }
    }

    loadGame();
  }, []);

  async function handleSubmit(value: number | null) {
    if (!game || submittingRef.current || game.completed_at) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      const result = await submitDailyGuess(
        game.current_position,
        value
      );

      if (!result) {
        throw new Error("The guess could not be submitted.");
      }

      if (result.completed) {
        setFinalScore(Number(result.total_score));
        return;
      }

      const nextState = await getDailyGameState();

      if (!nextState) {
        throw new Error("Could not load the next product.");
      }

      setGame(nextState);
      setGuess("");
      setRemaining(15);
    } catch (err) {
      // Check whether the submission actually succeeded
      // before displaying an error or allowing another submission.
      try {
        const latestState = await getDailyGameState();

        if (latestState) {
          if (latestState.completed_at) {
            setFinalScore(Number(latestState.total_score));
          } else if (
            latestState.current_position !== game.current_position
          ) {
            setGame(latestState);
            setGuess("");
            setRemaining(15);
          } else {
            setGame(latestState);
            setError(
              err instanceof Error
                ? err.message
                : "Please enter a positive value."
            );
          }
        }
      } catch {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // Countdown synchronized with the server's product start timestamp.
  useEffect(() => {
    if (!game || game.completed_at || finalScore !== null) {
      return;
    }

    function updateTimer() {
      const startedAt = Date.parse(
        game!.current_product_started_at
      );

      const elapsed = (Date.now() - startedAt) / 1000;
      const secondsLeft = Math.max(0, Math.ceil(15 - elapsed));

      setRemaining(secondsLeft);

      // Small grace period helps avoid sending an automatic
      // submission slightly before the server's 15-second deadline.
      if (
        elapsed >= 15.25 &&
        autoSubmittedPosition.current !== game!.current_position
      ) {
        autoSubmittedPosition.current = game!.current_position;
        handleSubmit(null);
      }
    }

    updateTimer();

    const interval = window.setInterval(updateTimer, 200);

    return () => window.clearInterval(interval);
  }, [
    game?.current_position,
    game?.current_product_started_at,
    game?.completed_at,
    finalScore,
  ]);

  function submitEarly(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const numericGuess = Number(guess);

    if (
      !guess.trim() ||
      !Number.isFinite(numericGuess) ||
      numericGuess < 0
    ) {
      setError("Enter a valid price of $0 or more.");
      return;
    }

    handleSubmit(numericGuess);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-gray-400">
        <Loader2 className="mr-3 animate-spin" />
        Loading your challenge...
      </div>
    );
  }

  if (finalScore !== null) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-green-400/20 bg-[#111a18] p-8 text-center">
        <Trophy className="mx-auto mb-5 text-green-400" size={52} />

        <p className="text-sm font-bold uppercase tracking-widest text-green-400">
          Challenge completed
        </p>

        <h2 className="mt-3 text-4xl font-black text-white">
          Your final score
        </h2>

        <p className="mt-5 text-6xl font-black text-green-400">
          {finalScore.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </p>

        <p className="mt-3 text-gray-400">
          Out of a possible 10,000 points
        </p>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-400/20 bg-red-400/10 p-6 text-center">
        <p className="font-semibold text-red-400">{error}</p>
      </div>
    );
  }

  if (!game || !game.product_name) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-gray-300">
          No product is currently available.
        </p>
      </div>
    );
  }

  const progress = (game.current_position / 10) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-bold text-white">
            PRODUCT {game.current_position} OF 10
          </span>

          <span className="text-gray-400">
            Score: {Number(game.total_score).toFixed(0)}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-green-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timer */}
      <div className="mb-5 flex items-center justify-center gap-3">
        <Clock3
          size={21}
          className={remaining <= 5 ? "text-red-400" : "text-green-400"}
        />

        <span
          className={`text-3xl font-black tabular-nums ${
            remaining <= 5 ? "text-red-400" : "text-white"
          }`}
        >
          00:{String(remaining).padStart(2, "0")}
        </span>
      </div>

      {/* Product */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111a18]">
        <div className="flex min-h-[280px] items-center justify-center bg-white p-6">
          {game.product_image_url ? (
            <img
              src={game.product_image_url}
              alt={game.product_name}
              className="max-h-64 max-w-full object-contain"
            />
          ) : (
            <p className="text-gray-500">
              Product image unavailable
            </p>
          )}
        </div>

        <div className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400">
            Guess the regular retail price
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {game.product_name}
          </h2>

          {game.product_url && (
            <a
              href={game.product_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-gray-400 underline hover:text-green-400"
            >
              View product details
            </a>
          )}

          <form onSubmit={submitEarly} className="mt-7 space-y-4">
            <label
              htmlFor="price-guess"
              className="block text-sm font-medium text-gray-300"
            >
              Your price guess (USD)
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-green-400">
              <span className="text-xl font-bold text-gray-400">
                $
              </span>

              <input
                id="price-guess"
                type="number"
                min="0"
                step="0.01"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter your guess"
                disabled={submitting || remaining === 0}
                className="w-full bg-transparent px-3 py-4 text-xl font-bold text-white outline-none placeholder:text-gray-600"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {remaining === 0 && (
              <button
                type="button"
                onClick={() => handleSubmit(null)}
                disabled={submitting}
                className="w-full rounded-xl border border-green-400/30 px-5 py-3 font-bold text-green-400 hover:bg-green-400/10 disabled:opacity-40"
              >
                {submitting ? "Submitting..." : "Retry automatic submission"}
              </button>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                remaining === 0 ||
                !guess.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-400 px-5 py-4 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit guess
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500">
            Your guess locks in when the timer expires.
            No guess entered means $0.
          </p>
        </div>
      </div>
    </div>
  );
}
