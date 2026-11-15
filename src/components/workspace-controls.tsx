import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
export function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>;
}
export function ExamBadge({ status }: { status: string }) {
  return <Badge variant="secondary" className={status === "active" ? "bg-success text-success-foreground capitalize" : status === "scheduled" ? "bg-warning text-warning-foreground capitalize" : "capitalize"}>{status}</Badge>;
}