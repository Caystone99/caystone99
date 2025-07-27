'use client';
import { useState } from "react";
import works from "@/data/works";
import { ArrowDown, ConstructionIcon, FileWarningIcon, Link2Icon, LinkIcon, MessageCircleWarning, PauseCircleIcon, } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}


export default function Home() {
  return (
    <>
      <section className="py-20 md:py-32">
        <div className="mx-5 flex flex-col gap-4 items-start md:mx-20">
          <h1 className="bhinacle text-4xl md:text-7xl font-black">Caleb-Livingstone Emmanuel</h1>
          <p className="bhinacle text-lg text-foreground/70">
            /krɪˈeɪtə/ (noun)
          </p>
          <em className="">
            A person or thing that brings something into existence.
          </em>
        </div>

        <div className="flex flex-col items-start gap-6 mt-10 mx-5 md:mx-20">
          <h2 className="bhinacle font-black text-2xl md:text-4xl">Examples</h2>
          <div className="grid grid-cols-1 gap-4 w-full">
            {
              works.map((work, idx) => (
                <div 
                  key={idx}
                  className="flex flex-col gap-2 border-b p-2 border-b-foreground/10"
                >
                  <div className="flex flex-row justify-between gap-4 items-center">
                    <h3 className="bhinacle text-lg md:text-xl font-black">{work.title}</h3>
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
                </div>
              ))
            }
          </div>
        </div>
      </section>
    </>
  );
}
