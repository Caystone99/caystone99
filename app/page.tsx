import Link from "next/link";
import Activity from "@/components/Activity";
import Bench from "@/components/Bench";
import Marble from "@/components/Marble";
import NoteList from "@/components/NoteList";
import Shell from "@/components/Shell";
import Swarm from "@/components/Swarm";
import Work from "@/components/Work";
import { person } from "@/lib/content";
import { countsByTopic, publishedNotes } from "@/lib/db";

// Weather refreshes every 15 minutes; publishing a note refreshes the page straight away.
export const revalidate = 900;

export default async function Home() {
  const { lead, words } = person.line;
  const [notes, counts] = await Promise.all([publishedNotes().catch(() => []), countsByTopic()]);

  return (
    <Shell>
      <Marble />
      <section className="hero">
        <div className="hero-text">
          <p className="motto">
            <span className="ipa">{person.pronunciation}</span>
            <span className="motto-dash" aria-hidden="true">—</span>
            <em title={person.mottoMeaning}>{person.motto}</em>
          </p>
          <h1 className="headline">
            {lead}{" "}
            {words.map((w, i) => (
              <span key={w}>
                <em>{w}</em>
                {i < words.length - 2 ? ", " : i === words.length - 2 ? " and " : "."}
              </span>
            ))}
          </h1>
          <p className="intro">{person.intro}</p>
        </div>
        <figure className="swarm-frame">
          <Swarm />
          <figcaption className="caption">A swarm with no leader: three local rules. Move through it.</figcaption>
        </figure>
      </section>

      <section className="section" aria-labelledby="bench">
        <div className="section-head">
          <h2 id="bench" className="h2">On the bench</h2>
          <p className="section-note">What I&apos;m building and learning, as it happens.</p>
        </div>
        <Bench notes={counts} />
      </section>

      <section className="section" aria-labelledby="notes">
        <div className="section-head">
          <h2 id="notes" className="h2">Notes</h2>
          <Link href="/notes" className="section-link">All notes<span aria-hidden="true">→</span></Link>
        </div>
        <Activity notes={notes} />
        {notes.length ? <NoteList notes={notes.slice(0, 3)} /> : <p className="empty">The first notes are on their way: progress on the arm, the hexapod and what I&apos;m reading on reinforcement learning.</p>}
      </section>

      <section className="section" aria-labelledby="work">
        <div className="section-head">
          <h2 id="work" className="h2">Work</h2>
          <p className="section-note">Where I work, and what I&apos;ve shipped for each.</p>
        </div>

        <Work />
      </section>

    </Shell>
  );
}
