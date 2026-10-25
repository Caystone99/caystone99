import type { Note } from "@/lib/db";

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// The last twelve weeks, one square per day, lit on days a note went up. It's there to keep me honest.
export default function Activity({ notes, weeks = 12 }: { notes: Note[]; weeks?: number }) {
  const today = new Date();
  const perDay = new Map<string, number>();
  for (const n of notes) if (n.publishedAt) perDay.set(n.publishedAt.slice(0, 10), (perDay.get(n.publishedAt.slice(0, 10)) ?? 0) + 1);

  // Columns are weeks starting Monday; the last column is this week.
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - ((today.getUTCDay() + 6) % 7)));
  const start = new Date(monday.getTime() - (weeks - 1) * 7 * DAY);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getTime() + i * DAY));
  const inWindow = days.filter((d) => d <= today).reduce((s, d) => s + (perDay.get(dayKey(d)) ?? 0), 0);
  const last = notes.find((n) => n.publishedAt)?.publishedAt;
  const since = last ? Math.floor((today.getTime() - new Date(last).getTime()) / DAY) : null;

  return (
    <div className="activity">
      <div className="activity-grid" style={{ ["--weeks" as string]: weeks }} aria-hidden="true">
        {days.map((d) => {
          const n = perDay.get(dayKey(d)) ?? 0;
          return <i key={dayKey(d)} className={d > today ? "is-future" : n ? `is-on lvl-${Math.min(n, 3)}` : undefined} title={`${dayKey(d)}: ${n} note${n === 1 ? "" : "s"}`} />;
        })}
      </div>
      <p className="activity-text">
        {since == null ? "No notes yet." : since === 0 ? "Last note today." : `Last note ${since} day${since === 1 ? "" : "s"} ago.`}{" "}
        <span>{inWindow} in the last {weeks} weeks.</span>
      </p>
    </div>
  );
}
