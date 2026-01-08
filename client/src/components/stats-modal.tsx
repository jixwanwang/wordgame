import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, Cake, BookHeart } from "lucide-react";
import { API, Auth } from "@/lib/api-client";
import { getTodayInPacificTime } from "../../../server/time-utils";

interface StatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Stats {
  firstGame: string;
  bestStreak: {
    dateEnded: string;
    streak: number;
  };
  bestGame: {
    date: string;
    guesses: number;
  };
  favoriteFirstGuess: {
    guess: string;
    percent: number;
  };
}

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function StatCard({ title, icon, children }: StatCardProps) {
  return (
    <Card>
      <div className="py-3.5 px-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold text-gray-600">{title}</div>
          {children}
        </div>
        {icon}
      </div>
    </Card>
  );
}

// Format date from MM-DD-YYYY to "Jan 1st, 2025"
function formatDate(dateStr: string): string {
  const [month, day, year] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getDaySuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${monthNames[month - 1]} ${day}${getDaySuffix(day)}, ${year}`;
}

export function StatsModal({ open, onOpenChange }: StatsModalProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchStats();
    }
  }, [open]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.getHistory();
      if (response.success && response.stats) {
        setStats(response.stats);
      } else {
        setError("No stats available");
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const isStreakActive = stats?.bestStreak.dateEnded === getTodayInPacificTime();
  const title = Auth.isAuthenticated() ? `${Auth.getUsername()}'s stats` : "Your Stats";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading stats...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        {stats && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="Best Streak" icon={<div className="text-3xl">🔥</div>}>
              <div className="flex items-center gap-1.5">
                <div className="text-md font-bold">{stats.bestStreak.streak} days</div>
                {isStreakActive ? (
                  <div className="text-sm font-semibold text-gray-500">and still going strong!</div>
                ) : (
                  <div className="text-sm text-gray-500">ended {stats.bestStreak.dateEnded}</div>
                )}
              </div>
            </StatCard>

            <StatCard
              title="Best Game"
              icon={<Trophy className="w-7 h-7 text-yellow-500 flex-shrink-0" />}
            >
              <div className="flex items-center gap-1.5">
                <div className="text-md font-bold">{stats.bestGame.guesses} guesses</div>
                <div className="text-sm text-gray-500">on {stats.bestGame.date}</div>
              </div>
            </StatCard>

            <StatCard
              title="Favorite First Guess"
              icon={<BookHeart className="w-7 h-7 text-gray-600 flex-shrink-0" />}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded-sm flex items-center justify-center text-sm font-bold text-dark">
                  {stats.favoriteFirstGuess.guess}
                </div>
                <div className="text-sm text-gray-500">
                  {(stats.favoriteFirstGuess.percent * 100).toFixed(0)}% of games
                </div>
              </div>
            </StatCard>

            <StatCard
              title="First Game"
              icon={<Cake className="w-7 h-7 text-blue-500 flex-shrink-0" />}
            >
              <div className="text-md font-bold">{formatDate(stats.firstGame)}</div>
            </StatCard>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
