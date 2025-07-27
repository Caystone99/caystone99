import { GithubIcon, LinkedinIcon, MailIcon, TwitterIcon } from "lucide-react";

export default function Header(){
  return (
    <nav className="relative py-4">
      <div className="flex sticky top-10 flex-row gap-4 mx-5 md:gap-6 md:mx-20 lg:gap-8">
        <a href='https://github.com/caystone99' target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground">
          <GithubIcon/>
        </a>
        <a href='https://x.com/caystone_99' target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground">
          <TwitterIcon/>
        </a>
        <a href='https://www.linkedin.com/in/caystone/' target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground">
          <LinkedinIcon/>
        </a>   
        <a href='mailto:emmanuelcaleblivingstone@gmail.com' target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-foreground">
          <MailIcon/>
        </a>       
      </div>
    </nav>
  );
}