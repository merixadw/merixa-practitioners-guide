import type { BodyId } from "@/lib/guide/types";
import { BODY_LABELS } from "@/lib/guide/types";

/** Bodies shown with a trademark mark when referenced in the UI. */
const TRADEMARKED: ReadonlySet<BodyId> = new Set([
  "IFRS",
  "CFA",
  "FRM",
  "IIA",
  "CRMA",
  "ACCA",
  "CGMA",
  "Merixa",
]);

export function bodyLabel(body: BodyId): string {
  const name = BODY_LABELS[body];
  return TRADEMARKED.has(body) ? `${name}™` : name;
}

export function BodyMark({
  body,
  className,
}: {
  body: BodyId;
  className?: string;
}) {
  const name = BODY_LABELS[body];
  const marked = TRADEMARKED.has(body);

  return (
    <span className={className ? `body-mark ${className}` : "body-mark"}>
      {name}
      {marked ? (
        <sup className="tm-mark" aria-hidden="true">
          ™
        </sup>
      ) : null}
      {marked ? <span className="sr-only"> trademark</span> : null}
    </span>
  );
}
