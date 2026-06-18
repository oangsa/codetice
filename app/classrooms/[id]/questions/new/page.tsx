import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { QuestionForm } from "@/components/questions/question-form";
import { requireUser } from "@/lib/auth";
import { getClassroomById } from "@/server/services/classroom-service";
import { listSupportedLanguages } from "@/server/services/language-service";

export default async function NewClassroomQuestionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await props.params;
  const [classroom, languages] = await Promise.all([
    getClassroomById(id),
    listSupportedLanguages(),
  ]);

  if (!classroom) notFound();

  const membership = classroom.members.find((m) => m.user.id === session.userId);
  const canManage = session.role === "admin" || membership?.role === "teacher";

  if (!canManage) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/classrooms/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {classroom.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Add new question</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a question with testcases and add it to{" "}
          <strong>{classroom.name}</strong>.
        </p>
      </div>

      <QuestionForm
        mode="create"
        classroomId={id}
        backUrl={`/classrooms/${id}`}
        languages={languages}
      />
    </div>
  );
}
