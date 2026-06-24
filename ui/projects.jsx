'use client';
import { ArrowUpRightIcon, ConstructionIcon, FileWarningIcon } from "lucide-react";
import { AnimatePresence, motion, useSpring } from 'motion/react';
import { useRef, useState } from 'react';

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// Rendered scale: a 1280px-wide page squeezed into the ~420px preview card.
const PREVIEW_W = 420;
const PREVIEW_H = 300;
const IFRAME_W = 1280;
const SCALE = PREVIEW_W / IFRAME_W;

export default function Projects({ works }) {
  const [active, setActive] = useState(null); // the hovered work
  const [loaded, setLoaded] = useState(false);
  const hasHover = useRef(true);

  // Smooth, slightly-trailing follow for the preview card.
  const x = useSpring(0, { stiffness: 260, damping: 28, mass: 0.6 });
  const y = useSpring(0, { stiffness: 260, damping: 28, mass: 0.6 });

  const handleMove = (e) => {
    // Flip the card to the left of the cursor when near the right edge.
    const flip = e.clientX + PREVIEW_W + 48 > window.innerWidth;
    const nx = flip ? e.clientX - PREVIEW_W - 24 : e.clientX + 24;
    // Keep the card vertically inside the viewport.
    const ny = Math.min(
      Math.max(e.clientY - PREVIEW_H / 2, 12),
      window.innerHeight - PREVIEW_H - 12
    );
    x.set(nx);
    y.set(ny);
  };

  const enter = (work, e) => {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return;
    hasHover.current = true;
    setLoaded(false);
    setActive(work);
    handleMove(e);
  };

  const leave = () => setActive(null);

  return (
    <div
      className="flex flex-col items-start gap-6 mt-10 mx-5 md:mx-20"
      onMouseMove={(e) => active && handleMove(e)}
    >
      <h2 className="bhinacle font-black text-2xl md:text-4xl">Projects</h2>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 gap-1 w-full"
      >
        {works.map((work, idx) => (
          <motion.div
            variants={itemVariants}
            key={work.id ?? idx}
            onMouseEnter={(e) => work.liveUrl && work.status !== 'terminated' && enter(work, e)}
            onMouseLeave={leave}
            className="group relative flex flex-col gap-2 rounded-lg border-b border-b-foreground/10 p-3 transition-colors duration-300 hover:bg-foreground/[0.04]"
          >
            {/* accent bar that grows on hover */}
            <span className="pointer-events-none absolute left-0 top-1/2 h-0 w-[2px] -translate-y-1/2 rounded-full bg-accent transition-all duration-300 group-hover:h-2/3" />

            <div className="flex flex-row justify-between gap-4 items-center">
              <div className="flex flex-row items-baseline gap-2 flex-wrap">
                <a
                  href={work.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bhinacle text-lg md:text-xl font-black transition-colors duration-200 group-hover:text-accent"
                >
                  {work.title}
                </a>
                {work.country && (
                  <span className="text-foreground/60 text-sm">{work.country}</span>
                )}
              </div>

              <div className="flex flex-row items-center gap-4">
                {work.liveUrl && work.status !== 'terminated' && (
                  <a
                    href={work.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${work.title}`}
                    className="text-foreground/70 transition-all duration-200 group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  >
                    <ArrowUpRightIcon size={20} />
                  </a>
                )}

                {work.status === 'in-progress' && (
                  <abbr className="text-foreground/70 hover:text-foreground no-underline" title="Under Construction">
                    <ConstructionIcon size={20} />
                  </abbr>
                )}

                {work.status === 'terminated' && (
                  <abbr className="text-foreground/70 hover:text-foreground no-underline" title="Terminated">
                    <FileWarningIcon size={20} />
                  </abbr>
                )}
              </div>
            </div>

            <p className="max-w-6xl font-light text-sm">{work.description}</p>

            <div className="flex flex-row mt-2 flex-wrap items-center gap-x-3 gap-y-1">
              {work.tech.map((item, i) => (
                <span key={i} className="text-foreground/60 text-sm">{item}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Cursor-following live iframe preview */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ x, y, width: PREVIEW_W, height: PREVIEW_H }}
            className="pointer-events-none fixed left-0 top-0 z-50 hidden overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-2xl md:block"
          >
            {/* tiny browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-foreground/10 bg-foreground/[0.04] px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
              <span className="ml-2 truncate text-[11px] text-foreground/50">
                {active.liveUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>

            <div className="relative" style={{ height: PREVIEW_H - 37 }}>
              {!loaded && (
                <div className="absolute inset-0 grid place-items-center bg-foreground/[0.03]">
                  <span className="text-xs text-foreground/40 animate-pulse">loading preview…</span>
                </div>
              )}
              <iframe
                src={active.liveUrl}
                title={`${active.title} preview`}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                sandbox="allow-scripts allow-same-origin"
                style={{
                  width: IFRAME_W,
                  height: (PREVIEW_H - 37) / SCALE,
                  transform: `scale(${SCALE})`,
                  transformOrigin: 'top left',
                }}
                className="border-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
