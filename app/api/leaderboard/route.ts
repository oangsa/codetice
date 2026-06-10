import { ok } from "@/lib/api";
import { getGlobalLeaderboard } from "@/server/services/leaderboard-service";

export async function GET() {
  const leaderboard = await getGlobalLeaderboard();
  return ok({ leaderboard });
}
