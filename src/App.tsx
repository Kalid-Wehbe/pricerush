
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  Menu,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";

import PlayerSetup from "./components/PlayerSetup";
import GameScreen from "./components/GameScreen";
import { supabase } from "./lib/supabase";

function App() {
  const [timeLeft, setTimeLeft] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [checkingPlayer, setCheckingPlayer] = useState(true);

  const [player, setPlayer] = useState<{
    id: string;
    display_name: string;
  } | null>(null);

  // Restore the existing player after a page refresh.
  useEffect(() => {
    async function restorePlayer() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session?.user) {
          const { data, error } = await supabase
            .from("players")
            .select("id, display_name")
            .eq("id", session.user.id)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setPlayer(data);
          }
        }
      } catch (err) {
        console.error("Could not restore player session:", err);
      } finally {
        setCheckingPlayer(false);
      }
    }

    restorePlayer();
  }, []);

  // Countdown to the next UTC challenge.
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);

      tomorrow.setUTCHours(24, 0, 0, 0);

      const difference = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(difference / 3600000);
      const minutes = Math.floor((difference % 3600000) / 60000);
      const seconds = Math.floor((difference % 60000) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#090b10] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/[0.07] bg-[#090b10]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-400 text-black">
              <Target size={23} strokeWidth={2.5} />
            </div>

            <span className="text-xl font-black tracking-tight">
              PRICE<span className="text-green-400">RUSH</span>
            </span>
          </a>

          <div className="hidden items-center gap-9 text-sm font-medium text-gray-400 md:flex">
            <a href="#" className="text-white">
              Daily Challenge
            </a>

            <a href="#leaderboard" className="transition hover:text-white">
              Leaderboard
            </a>

            <a href="#how-to-play" className="transition hover:text-white">
              How to play
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Free to play
            </span>

            <a
              href="#challenge"
              className="rounded-lg bg-green-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-green-300"
            >
              Play today
            </a>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Toggle menu"
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenu && (
          <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-5 text-sm text-gray-300 md:hidden">
            <a href="#challenge" onClick={() => setMobileMenu(false)}>
              Daily Challenge
            </a>

            <a href="#leaderboard" onClick={() => setMobileMenu(false)}>
              Leaderboard
            </a>

            <a href="#how-to-play" onClick={() => setMobileMenu(false)}>
              How to play
            </a>
          </div>
        )}
      </nav>

      {/* Game Screen */}
      {showGame && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#090b10]">
          <div className="mx-auto max-w-7xl px-5 pt-6">
            <button
              onClick={() => setShowGame(false)}
              className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-green-400/40 hover:text-green-400"
            >
              ← Back to homepage
            </button>

            <GameScreen />
          </div>
        </div>
      )}

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-14 lg:px-8 lg:pt-20">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/[0.07] px-4 py-2 text-xs font-semibold text-green-400">
            <Sparkles size={14} />
            A NEW CHALLENGE EVERY DAY
          </div>

          <h1 className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Think you know
            <br />
            what things <span className="text-green-400">cost?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
            10 real products. 10 price guesses. One chance every day. See how
            your pricing skills stack up against the world.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-2">
              <CalendarDays size={15} className="text-green-400" />
              New challenge daily
            </span>

            <span className="flex items-center gap-2">
              <Users size={15} className="text-green-400" />
              No email or password required
            </span>

            <span className="flex items-center gap-2">
              <Trophy size={15} className="text-green-400" />
              Global leaderboard
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Daily Challenge */}
          <section
            id="challenge"
            className="relative overflow-hidden rounded-2xl border border-green-400/20 bg-[#101710] p-7 lg:col-span-2 lg:p-9"
          >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-400/[0.07] blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-green-400">
                  <Zap size={15} />
                  DAILY CHALLENGE
                </span>

                <span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-xs text-green-400">
                  FREE
                </span>
              </div>

              <h2 className="mt-8 text-3xl font-bold sm:text-4xl">
                Today's 10 products
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
                From everyday essentials to expensive surprises. How accurately
                can you guess their market value?
              </p>

              <div className="mt-9 grid grid-cols-5 gap-3 sm:grid-cols-10">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-bold text-gray-400 transition hover:border-green-400/40 hover:text-green-400"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <div className="mt-9 flex flex-col gap-5 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    NEXT CHALLENGE IN
                  </p>

                  <div className="mt-2 flex items-center gap-2 font-mono text-2xl font-bold tracking-wider">
                    <Clock3 size={19} className="text-green-400" />
                    {timeLeft || "00:00:00"}
                  </div>
                </div>

                {checkingPlayer ? (
                  <div className="w-full max-w-sm rounded-xl border border-white/10 px-6 py-4 text-sm text-gray-400">
                    Restoring your player...
                  </div>
                ) : player ? (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-xl border border-green-400/20 bg-green-400/10 px-6 py-3">
                      <p className="text-xs text-gray-400">
                        SIGNED IN AS
                      </p>

                      <p className="mt-1 font-bold text-green-400">
                        {player.display_name}
                      </p>
                    </div>

                    <button
                      onClick={() => setShowGame(true)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-green-400 px-6 py-4 font-bold text-black transition hover:bg-green-300"
                    >
                      Play today's challenge
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-sm">
                    <PlayerSetup onPlayerReady={setPlayer} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Ad Space */}
          <aside className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0d1017] p-6 text-center">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-gray-600">
              ADVERTISEMENT
            </span>

            <div className="my-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.035]">
              <Zap size={27} className="text-gray-600" />
            </div>

            <p className="text-sm font-medium text-gray-500">
              Ad space reserved
            </p>

            <p className="mt-2 max-w-[190px] text-xs leading-5 text-gray-600">
              This space will be used for advertisements.
            </p>
          </aside>
        </div>

        {/* Leaderboard */}
        <section
          id="leaderboard"
          className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <div className="rounded-2xl border border-white/[0.07] bg-[#10131b] p-7 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-green-400">
                  <Trophy size={17} />

                  <span className="text-xs font-bold tracking-widest">
                    COMPETITION
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-bold">
                  Today's leaderboard
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Who knows their prices best?
                </p>
              </div>

              <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400">
                Daily
              </span>
            </div>

            <div className="mt-7">
              <div className="grid grid-cols-12 border-b border-white/[0.08] pb-3 text-[10px] font-bold tracking-widest text-gray-500">
                <span className="col-span-2">RANK</span>
                <span className="col-span-7">PLAYER</span>
                <span className="col-span-3 text-right">SCORE</span>
              </div>

              <div className="py-10 text-center">
                <Trophy size={30} className="mx-auto text-gray-600" />

                <p className="mt-4 font-semibold text-gray-400">
                  No leaderboard results yet
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  Be among the first to play PriceRush!
                </p>
              </div>
            </div>

            <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm font-semibold text-gray-400 transition hover:border-green-400/40 hover:text-green-400">
              Full leaderboard coming soon
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Statistics */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/[0.07] bg-[#10131b] p-6">
              <div className="flex items-center gap-2 text-green-400">
                <Users size={17} />

                <span className="text-xs font-bold tracking-widest">
                  COMMUNITY
                </span>
              </div>

              <p className="mt-5 text-4xl font-black">--</p>
              <p className="mt-2 text-sm text-gray-500">Players today</p>

              <p className="mt-5 text-xs text-gray-600">
                Statistics coming soon
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#10131b] p-6">
              <div className="flex items-center gap-2 text-green-400">
                <Flame size={17} />

                <span className="text-xs font-bold tracking-widest">
                  DAILY WINNERS
                </span>
              </div>

              <p className="mt-5 text-2xl font-bold">Coming soon</p>

              <p className="mt-2 text-sm text-gray-500">
                Today's best players will be featured here.
              </p>
            </div>
          </div>
        </section>

        {/* How to Play */}
        <section id="how-to-play" className="mt-20">
          <div className="text-center">
            <span className="text-xs font-bold tracking-widest text-green-400">
              SIMPLE TO PLAY
            </span>

            <h2 className="mt-3 text-3xl font-bold">How it works</h2>

            <p className="mt-3 text-sm text-gray-500">
              Three steps. Ten products. One daily score.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                icon: <Target size={23} />,
                title: "See the product",
                description:
                  "Get shown 10 real products from around the internet.",
              },
              {
                number: "02",
                icon: <Sparkles size={23} />,
                title: "Guess the price",
                description:
                  "Enter what you think each product is worth in USD.",
              },
              {
                number: "03",
                icon: <Trophy size={23} />,
                title: "Compare your score",
                description:
                  "See your ranking and compete against everyone.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/[0.07] bg-[#10131b] p-7"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-400/10 text-green-400">
                    {step.icon}
                  </div>

                  <span className="font-mono text-sm text-gray-600">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-bold">{step.title}</h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-gray-500 sm:flex-row lg:px-8">
          <span className="font-bold tracking-tight text-white">
            PRICE<span className="text-green-400">RUSH</span>
          </span>

          <span>
            10 products. One daily challenge. How good are your guesses?
          </span>

          <span>© 2026 PriceRush</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
