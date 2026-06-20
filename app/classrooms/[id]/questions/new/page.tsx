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
      {/* Breadcrumb Navigation & Form */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link
            href={`/classrooms/${id}`}
            className="inline-flex items-center gap-1 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {classroom.name}
          </Link>
        </nav>

        <QuestionForm
          mode="create"
          classroomId={id}
          backUrl={`/classrooms/${id}`}
          languages={languages}
        />
      </div>
    </div>
  );
}
