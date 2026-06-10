import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Plus } from "lucide-react";

import { QuestionTable } from "@/components/classrooms/question-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getClassroomById, getClassroomQuestionsForUser } from "@/server/services/classroom-service";

export default async function ClassroomDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;

  const [classroom, questionRows] = await Promise.all([
    getClassroomById(id),
    getClassroomQuestionsForUser(id, session.userId),
  ]);

  if (!classroom) notFound();

  const totalQuestions = questionRows.length;
  const incompleteCount = questionRows.filter((q) => q.status !== "accepted").length;
  const membership = classroom.members.find((m) => m.user.id === session.userId);
  const canManage = session.role === "admin" || membership?.role === "teacher";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="hover:text-slate-900">
          Dashboard
        </Link>
        <span>›</span>
        <span className="text-slate-900">{classroom.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: classroom identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xl font-bold text-white">
            {classroom.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{classroom.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Invite code:{" "}
              <span className="font-mono font-medium">{classroom.inviteCode}</span>
            </p>
          </div>
        </div>

        {/* Right: stats card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:min-w-72">
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalQuestions}</p>
              <p className="mt-0.5 text-xs text-slate-500">Total assignments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{incompleteCount}</p>
              <p className="mt-0.5 text-xs text-slate-500">Incomplete assignments</p>
            </div>
          </div>
          {membership && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Joined{" "}
                <strong className="text-slate-700">{formatDate(membership.joinedAt)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assignments">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="assignments">Assignment</TabsTrigger>
            <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
            <TabsTrigger value="participants">Participant</TabsTrigger>
          </TabsList>
          {canManage && (
            <Button asChild size="sm">
              <Link href={`/classrooms/${id}/questions/new`}>
                <Plus className="h-4 w-4" />
                Add question
              </Link>
            </Button>
          )}
        </div>

        {/* Assignments tab */}
        <TabsContent value="assignments" className="mt-4">
          <QuestionTable questions={questionRows} classroomId={id} />
        </TabsContent>

        {/* Scoreboard tab */}
        <TabsContent value="scoreboard" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="w-20">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classroom.members.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell className="text-slate-400">{index + 1}</TableCell>
                    <TableCell className="font-medium">{member.user.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant={member.role === "teacher" ? "warning" : "default"}
                        className="capitalize"
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Participants tab */}
        <TabsContent value="participants" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
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
                    <TableCell className="text-slate-500">{formatDate(member.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
