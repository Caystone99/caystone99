'use client';
import works from "@/data/works";
import Projects from "@/ui/projects";
import { motion } from 'motion/react';

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  return (
    <section className="py-20 md:py-32">
      <motion.div
        variants={heroContainer}
        initial="hidden"
        animate="show"
        className="mx-5 flex flex-col gap-4 items-start md:mx-20"
      >
        <motion.h1
          variants={heroItem}
          className="bhinacle text-4xl md:text-7xl font-black"
        >
          Caleb-Livingstone Emmanuel
        </motion.h1>
        <motion.p variants={heroItem} className="bhinacle text-lg text-foreground/70">
          /krɪˈeɪtə/ (noun)
        </motion.p>
        <motion.em variants={heroItem}>
          Full-stack Software Engineer, Robotics Software Engineer
        </motion.em>
      </motion.div>

      <Projects works={works} />
    </section>
  );
}
