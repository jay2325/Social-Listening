import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700",
        positive:  "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
        neutral:   "bg-amber-500/10  text-amber-400  ring-1 ring-amber-500/20",
        negative:  "bg-red-500/10    text-red-400    ring-1 ring-red-500/20",
        nano:      "bg-zinc-800      text-zinc-400   ring-1 ring-zinc-700",
        micro:     "bg-sky-500/10    text-sky-400    ring-1 ring-sky-500/20",
        macro:     "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
        mega:      "bg-amber-500/10  text-amber-400  ring-1 ring-amber-500/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
