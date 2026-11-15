import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-xl font-bold", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg text-sm font-black",
          inverted ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        E
      </span>
      <span>
        Exam<span className="text-highlight">Hub</span>
      </span>
    </Link>
  );
}
