import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatScore } from "@/lib/utils";
import { listAdminQuestions } from "@/server/services/question-service";

export default async function AdminQuestionsPage() {
  await requireAdmin();
  const questions = await listAdminQuestions();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Questions</CardTitle>
          <CardDescription>Create, edit, and publish problem statements.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/admin/questions/new">New question</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell>{question.title}</TableCell>
                <TableCell>
                  <Badge variant="info">{question.difficulty}</Badge>
                </TableCell>
                <TableCell>{formatScore(question.totalScore)}</TableCell>
                <TableCell>
                  <Badge variant={question.isPublished ? "success" : "warning"}>
                    {question.isPublished ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/questions/${question.id}/edit`} className="text-sm font-medium text-sky-700 hover:text-sky-800">
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
