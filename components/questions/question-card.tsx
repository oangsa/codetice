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
    <Card className="flex h-full flex-col border-white/10 bg-[#0f172a]/88 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base text-slate-100">{question.title}</CardTitle>
          <Badge variant="info" className="border border-cyan-400/15 bg-cyan-400/10 text-cyan-200">
            {question.difficulty}
          </Badge>
        </div>
        <CardDescription className="text-slate-400">Worth {formatScore(question.totalScore)} points</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Best score</span>
          <span className="font-medium text-slate-100">{formatScore(question.bestScore ?? 0)}</span>
        </div>
        <Progress value={progress ?? 0} className="bg-white/8" />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{question.attempts ?? 0} attempts</span>
          {typeof question.isPublished === "boolean" ? (
            <Badge
              variant={question.isPublished ? "success" : "warning"}
              className="border border-white/10 bg-white/[0.04] uppercase tracking-[0.08em]"
            >
              {question.isPublished ? "Published" : "Draft"}
            </Badge>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button className="w-full border border-cyan-400/30 bg-cyan-400/12 text-cyan-50 hover:bg-cyan-400/20" asChild>
          <Link href={`/questions/${question.slug}`}>Open question</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
