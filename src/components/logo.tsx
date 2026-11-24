import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import mark from "@/assets/examhub-mark.png";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-xl font-bold", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          inverted ? "bg-sidebar-accent ring-1 ring-sidebar-primary/60" : "bg-primary text-primary-foreground",
        )}
      >
        <img src={mark} alt="" aria-hidden="true" width={22} height={22} className="size-[22px]" />
      </span>
      <span>
        Exam<span className="text-highlight">Hubb</span>
      </span>
    </Link>
  );
}
