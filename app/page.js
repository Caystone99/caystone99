'use client';
import works from "@/data/works";
import { ConstructionIcon, FileWarningIcon, LinkIcon, } from "lucide-react";
import { motion } from 'motion/react';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};


export default function Home() {
  return (
    <>
      <section className="py-20 md:py-32">
        <div className="mx-5 flex flex-col gap-4 items-start md:mx-20">
          <motion.h1 
            className="bhinacle text-4xl md:text-7xl font-black"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Caleb-Livingstone Emmanuel
          </motion.h1>
          <p className="bhinacle text-lg text-foreground/70">
            /krɪˈeɪtə/ (noun)
          </p>
          <motion.em 
            className=""
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            A person or thing that brings something into existence.
          </motion.em>
        </div>

        <div className="flex flex-col items-start gap-6 mt-10 mx-5 md:mx-20">
          <h2 className="bhinacle font-black text-2xl md:text-4xl">Examples</h2>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-4 w-full"
          >
            {
              works.map((work, idx) => (
                <motion.div 
                  variants={itemVariants}
                  key={idx}
                  className="flex flex-col gap-2 border-b p-2 border-b-foreground/10"
                >
                  <div className="flex flex-row justify-between gap-4 items-center">
                    <div className="flex flex-row items-baseline gap-2 flex-wrap">
                      <h3 className="bhinacle text-lg md:text-xl font-black">{work.title}</h3>
                      {work.country && (
                        <span className="text-foreground/60 text-sm">{work.country}</span>
                      )}
                    </div>
                    <div className="flex flex-row gap-4">
                      
                      {
                        work.liveUrl && work.status !== 'terminated' &&
                        <a href={work.liveUrl} target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground">
                          <LinkIcon size={20}/>
                        </a>
                      }

                      {
                        work.status === 'in-progress' && work.status !== 'terminated' &&
                        <abbr className="text-foreground/70 hover:text-foreground" titl="Under Construction">
                          <ConstructionIcon size={20} />
                        </abbr>
                      }

                      {
                        work.status === 'terminated' &&
                        <abbr className="text-foreground/70 hover:text-foreground" titl="Under Construction">
                          <FileWarningIcon size={20} />
                        </abbr>
                      }

                    </div>
                  </div>
                  <p className="max-w-6xl font-light text-sm">{work.description}</p>
                  <div className="flex flex-row mt-2 flex-wrap items-center gap-2">
                    {work.tech.map((item, idx) => (
                      <span key={idx} className="text-foreground/60 text-sm">{item}</span>
                    ))}
                  </div>
                </motion.div>
              ))
            }
          </motion.div>
        </div>
      </section>
    </>
  );
}
