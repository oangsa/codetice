import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OutputPanel({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-white/10 bg-[#0f172a]/88">
      <CardHeader className="border-b border-white/8 pb-4">
        <CardTitle className="text-base text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="min-h-36 whitespace-pre-wrap rounded-md border border-white/8 bg-black/35 p-4 text-sm text-slate-100">
          {value || "No output yet."}
        </pre>
      </CardContent>
    </Card>
  );
}
