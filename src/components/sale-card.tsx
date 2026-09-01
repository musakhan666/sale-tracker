import { SaleStatusBadge } from "@/components/sale-status-badge";

import type { Doc } from "../../convex/_generated/dataModel";
import type { SaleStatus } from "../../convex/lib/window";

const startTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

type SaleCardProps = {
  sale: Doc<"sales">;
  brandName: string;
  /** Status derived once, at request time, by the page — never re-derived here. */
  status: SaleStatus;
};

export function SaleCard({ sale, brandName, status }: SaleCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 text-text sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted">{brandName}</p>
        <h3 className="text-lg font-semibold text-text">{sale.title}</h3>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <div className="flex gap-1">
            <dt className="font-medium text-text">Discount</dt>
            <dd>{sale.discountPercent}% off</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium text-text">Starts</dt>
            <dd>
              <time dateTime={new Date(sale.startsAt).toISOString()}>
                {startTimeFormatter.format(sale.startsAt)}
              </time>
            </dd>
          </div>
        </dl>
      </div>
      <SaleStatusBadge startsAt={sale.startsAt} endsAt={sale.endsAt} initialStatus={status} />
    </article>
  );
}
