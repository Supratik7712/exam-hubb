import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { countWords } from "@/lib/exam-rules";

/** Small answer space for short answer questions, with a live word count against the limit. */
export function AnswerBox({ wordLimit, value, onChange, label = "Your answer" }: { wordLimit: number; value?: string; onChange?: (v: string) => void; label?: string }) {
  const [local, setLocal] = useState("");
  const text = value ?? local;
  const words = countWords(text);
  const over = words > wordLimit;
  return <div className="space-y-1.5">
    <Textarea aria-label={label} rows={4} className="min-h-24 resize-y" placeholder={`Write your answer in up to ${wordLimit} words`} value={text} onChange={e => { setLocal(e.target.value); onChange?.(e.target.value); }} />
    <p className={`text-right text-xs ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{words} / {wordLimit} words{over ? " — over the limit" : ""}</p>
  </div>;
}
