import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { getGlobalLeaderboard } from "@/server/services/leaderboard-service";

export default async function LeaderboardPage() {
  await requireUser();
  const leaderboard = await getGlobalLeaderboard();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Global ranking by total best score and solved question count.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Total Score</TableHead>
              <TableHead>Solved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, index) => (
              <TableRow key={entry.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{entry.user.username}</TableCell>
                <TableCell>{formatScore(entry.totalScore)}</TableCell>
                <TableCell>{entry.solvedCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
