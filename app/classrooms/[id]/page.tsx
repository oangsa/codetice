import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Plus } from "lucide-react";

import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { QuestionTable } from "@/components/classrooms/question-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { formatDate, formatScore } from "@/lib/utils";
import { getClassroomById, getClassroomQuestionsForUser } from "@/server/services/classroom-service";
import { getClassroomLeaderboard } from "@/server/services/leaderboard-service";

export default async function ClassroomDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;

  const classroom = await getClassroomById(id);
  if (!classroom) notFound();

  const membership = classroom.members.find((m) => m.user.id === session.userId);
  const canManage = session.role === "admin" || membership?.role === "teacher";

  const [questionRows, leaderboard] = await Promise.all([
    getClassroomQuestionsForUser(id, session.userId, canManage),
    getClassroomLeaderboard(id),
  ]);

  const totalQuestions = questionRows.length;
  const incompleteCount = questionRows.filter((q) => q.status !== "accepted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Classroom Workspace"
        title={classroom.name}
        description={`Invite code ${classroom.inviteCode}. Track question progress, compare scores, and manage participants from one workspace.`}
        actions={
          <>
            <Badge variant="info">{totalQuestions} questions</Badge>
            <Badge variant="warning">{incompleteCount} incomplete</Badge>
            {canManage ? (
              <Button asChild size="sm">
                <Link href={`/classrooms/${id}/questions/new`}>
                  <Plus className="h-4 w-4" />
                  Add question
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard title="Invite Code">
          <p className="font-mono text-xl font-semibold text-slate-900 dark:text-slate-100">{classroom.inviteCode}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Share this code with students to join the workspace.</p>
        </SurfaceCard>
        <SurfaceCard title="Question Progress">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalQuestions}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Published and draft questions attached to this classroom.</p>
        </SurfaceCard>
        <SurfaceCard title="Membership">
          {membership ? (
            <div className="space-y-2">
              <Badge variant={membership.role === "teacher" ? "warning" : "default"} className="capitalize">
                {membership.role}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined {formatDate(membership.joinedAt)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">This workspace is visible through administrative access.</p>
          )}
        </SurfaceCard>
      </div>

      <Tabs defaultValue="assignments">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="assignments">Questions</TabsTrigger>
            <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
            <TabsTrigger value="participants">Participant</TabsTrigger>
          </TabsList>
          <Link href="/classrooms" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            Back to classrooms
          </Link>
        </div>

        <TabsContent value="assignments" className="mt-4">
          <QuestionTable questions={questionRows} classroomId={id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="scoreboard" className="mt-4">
          <SurfaceCard title="Classroom Leaderboard" description="Best recorded score totals for members of this classroom.">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="w-24">Role</TableHead>
                  <TableHead className="w-28 text-right">Solved</TableHead>
                  <TableHead className="w-32 text-right">Total score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboard.map((entry, index) => (
                    <TableRow key={entry.userId}>
                      <TableCell className="font-medium tabular-nums text-slate-500 dark:text-slate-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{entry.username}</TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.role === "teacher" ? "warning" : "default"}
                          className="capitalize"
                        >
                          {entry.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {entry.solved}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatScore(entry.totalScore.toString())}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SurfaceCard>
        </TabsContent>

        <TabsContent value="participants" className="mt-4">
          <SurfaceCard title="Participants" description="Members currently attached to this classroom workspace.">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead>Username</TableHead>
                  <TableHead className="w-24">Role</TableHead>
                  <TableHead className="w-40">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classroom.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.user.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === "teacher" ? "warning" : "default"}
                        className="capitalize"
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{formatDate(member.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SurfaceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
