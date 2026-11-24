import { Loader2 } from "lucide-react";

export function PagePending() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] w-full items-center justify-center">
      <div className="flex items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm animate-in fade-in-0 duration-300">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Loading…
      </div>
    </div>
  );
}
