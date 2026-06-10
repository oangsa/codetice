import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatScore } from "@/lib/utils";

export function QuestionCard({
  question,
  progress,
}: {
  question: {
    title: string;
    slug: string;
    difficulty: string;
    totalScore: string;
    bestScore?: string | null;
    attempts?: number | null;
    isPublished?: boolean;
  };
  progress?: number;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{question.title}</CardTitle>
          <Badge variant="info">{question.difficulty}</Badge>
        </div>
        <CardDescription>Worth {formatScore(question.totalScore)} points</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Best score</span>
          <span className="font-medium text-slate-900">{formatScore(question.bestScore ?? 0)}</span>
        </div>
        <Progress value={progress ?? 0} />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{question.attempts ?? 0} attempts</span>
          {typeof question.isPublished === "boolean" ? (
            <Badge variant={question.isPublished ? "success" : "warning"}>
              {question.isPublished ? "Published" : "Draft"}
            </Badge>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button className="w-full" asChild>
          <Link href={`/questions/${question.slug}`}>Open question</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
