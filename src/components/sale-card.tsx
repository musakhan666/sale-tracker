import { brandInitials, brandTileClass } from "@/lib/brand-tile";
import { cn } from "@/lib/cn";
import { SaleCountdown } from "@/components/sale-countdown";
import { SaleStatusBadge } from "@/components/sale-status-badge";

import type { Doc } from "../../convex/_generated/dataModel";
import type { SaleStatus } from "../../convex/lib/window";

type SaleCardProps = {
  sale: Doc<"sales">;
  brandName: string;
  /** The brand's stable slug — picks the tile, so a brand looks the same everywhere. */
  brandSlug: string;
  /** Status derived once, at request time, by the page — never re-derived here. */
  status: SaleStatus;
};

export function SaleCard({ sale, brandName, brandSlug, status }: SaleCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-surface text-text transition-shadow duration-300 hover:shadow-lg",
        // A live sale is the one thing worth interrupting the grid for.
        status === "live" ? "border-accent" : "border-border",
      )}
    >
      <div className={cn("relative flex aspect-[16/10] items-center justify-center", brandTileClass(brandSlug))}>
        <span aria-hidden="true" className="text-5xl font-bold tracking-tight text-surface/40">
          {brandInitials(brandName)}
        </span>
        <span className="absolute top-3 right-3">
          <SaleStatusBadge startsAt={sale.startsAt} endsAt={sale.endsAt} initialStatus={status} />
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-surface/90 px-3 py-1 text-sm font-bold text-text">
          {sale.discountPercent}% off
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-5">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">{brandName}</p>
        <h3 className="text-lg leading-snug font-semibold text-balance text-text">{sale.title}</h3>
        <p className="mt-auto pt-4 text-sm text-muted">
          <SaleCountdown startsAt={sale.startsAt} endsAt={sale.endsAt} initialStatus={status} />
        </p>
      </div>
    </article>
  );
}
