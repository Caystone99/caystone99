"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowDown, Github, Linkedin, Mail, Twitter } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, ExternalLink } from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const projects = [
  {
    id: "what2plan",
    title: "What2Plan",
    description: "AI-driven recommendation app for fun things to do, built with Flutter and Mistral 7B.",
    fullDescription:
      "What2Plan is an innovative AI-powered mobile application that helps users discover exciting activities and experiences in their area. Built with Flutter for cross-platform compatibility and powered by Mistral 7B for intelligent recommendations, the app analyzes user preferences, location, weather, and time constraints to suggest personalized activities.",
    tech: ["Flutter", "Mistral 7B", "AI/ML", "Firebase", "Node.js"],
    image: "/assets/w2p4.png",
    images: [
      "/assets/w2p2.png",
      "/assets/w2p3.png",
      "/assets/w2p4.png",
    ],
    features: [
      "AI-powered activity recommendations",
      "Real-time weather integration",
      "Location-based suggestions",
      "User preference learning",
      "Social sharing capabilities",
      "Offline mode support",
    ],
    //liveUrl: "https://what2plan.app",
    //githubUrl: "https://github.com/caleb/what2plan",
    status: "In-Progress",
  },
  {
    id: "stexys",
    title: "Stexys",
    description: "Platform for event creators and attendees with strong local presence.",
    fullDescription:
      "Stexys is a comprehensive event management platform that connects event creators with local communities. The platform features robust event creation tools, attendee management, ticketing system, and community engagement features designed to strengthen local event ecosystems.",
    tech: ["Flutter", "Next.js", "React", "Node.js", "MongoDB", "Express", "Paystack"],
    image: "/assets/stexys.png",
    images: [
      "/assets/stexys.png",
      "/assets/stexys2.png",
    ],
    features: [
      "Event creation and management",
      "Real-time attendee tracking",
      "Integrated payment processing",
      "Community engagement tools",
      "Analytics dashboard",
      "Mobile-responsive design",
    ],
    liveUrl: "https://stexys.com",
    //githubUrl: "https://github.com/caleb/stexys",
    status: "Live",
  },
  {
    id: "wespeakafrica",
    title: "Speak Africa",
    description: "Next.js site showcasing African art and media.",
    fullDescription:
      "WeSpeakAfrica is a digital platform celebrating African creativity, art, and media. Built with Next.js for optimal performance, the site features a curated collection of African artists, writers, and creators, providing them with a platform to showcase their work to a global audience.",
    tech: ["Next.js", "React", "Tailwind CSS", "MongoDB", "AWS S3", "Vercel", "Stripe"],
    image: "/assets/speak1.png",
    images: [
      "/assets/speak2.png",
      "/assets/speak3.png",
      "/assets/speak1.png",
    ],
    features: [
      "Artist portfolio galleries",
      "Content management system",
      "SEO optimized pages",
      "Responsive design",
      "Multi-language support",
      "Social media integration",
    ],
    liveUrl: "https://wespeakafrica.com",
    //githubUrl: "https://github.com/caleb/wespeakafrica",
    status: "Live",
  },
  {
    id: "mokexpress",
    title: "Mok Express",
    description: "Logistics and delivery platform, fullstack build.",
    fullDescription:
      "Mok Express is a comprehensive logistics and delivery management platform designed for modern e-commerce businesses. The platform handles everything from order management to real-time tracking, driver assignment, and customer notifications.",
    tech: ["React", "Node.js", "Express", "PostgreSQL", "Google Maps"],
    image: "/assets/mok1.png",
    images: [
      "/assets/mok2.png",
      "/assets/mok1.png",
      "/assets/mok3.png",
    ],
    features: [
      "Real-time order tracking",
      "Driver management system",
      "Route optimization",
      "Customer notifications",
      "Analytics dashboard",
      "API integration",
    ],
    liveUrl: "https://mokexpresservices.com/",
    //githubUrl: "https://github.com/caleb/mokexpress",
    status: "Live",
  },
  {
    id: "lysted",
    title: "Lysted by Treker",
    description: "Real estate rental & listing platform.",
    fullDescription:
      "Lysted by Treker is a modern real estate platform that simplifies property rental and listing processes. The platform connects property owners with potential tenants through an intuitive interface, advanced search capabilities, and comprehensive property management tools.",
    tech: ["Flutter", "GetX", "Node.js", "MongoDB", "AWS S3",  "Paystack"],
    image: "/assets/lysted1.png",
    images: [
      "/assets/lysted2.png",
      "/assets/lysted3.png",
      "/assets/lysted1.png",
    ],
    features: [
      "Advanced property search",
      "Virtual property tours",
      "Tenant screening tools",
      "Payment processing",
      "Property management dashboard",
      "Mobile application",
    ],
    //liveUrl: "https://lysted.treker.com",
    //githubUrl: "https://github.com/caleb/lysted",
    status: "Live",
  },
  {
    id: "beninfy",
    title: "Beninfy",
    description: "Ride-hailing and car rental app in Benin, built with Flutter.",
    fullDescription:
      "Beninfy is a comprehensive mobility solution for Benin, offering both ride-hailing and car rental services. Built with Flutter for seamless cross-platform experience, the app connects drivers with passengers while also providing flexible car rental options for longer trips.",
    tech: ["Flutter", "Firebase", "Mapbox", "Stripe", "Node.js"],
    image: "/assets/ben1.png",
    images: [
      "/assets/ben1.png",
      "/assets/ben2.png",
      "/assets/ben3.png",
    ],
    features: [
      "Real-time ride matching",
      "Car rental booking system",
      "Driver verification",
      "In-app payments",
      "Trip history and receipts",
      "Multi-language support",
    ],
    //liveUrl: "https://beninfy.app",
    //githubUrl: "https://github.com/caleb/beninfy",
    status: "in-progress",
  },
  {
    id: "excelsior",
    title: "Excelsior Africa Website",
    description: "Corporate portfolio site for a pan-African innovation firm.",
    fullDescription:
      "The Excelsior Africa website is a sophisticated corporate portfolio showcasing the firm's pan-African innovation initiatives. Built with modern web technologies, the site features dynamic content, interactive elements, and a professional design that reflects the company's commitment to African innovation and development.",
    tech: ["Next.js", "React", "Framer Motion", "Tailwind CSS", "Contentful"],
    image: "/assets/excel1.png",
    images: [
      "/assets/excel1.png",
      "/assets/excel2.png",
      "/assets/excel3.png",
    ],
    features: [
      "Interactive company timeline",
      "Project showcase galleries",
      "Team member profiles",
      "News and insights blog",
      "Contact and inquiry forms",
      "Multi-device optimization",
    ],
    liveUrl: "https://excelsiorafrica.com",
    //githubUrl: "https://github.com/caleb/excelsior-africa",
    status: "Live",
  },
]

const books = [
  {
    title: "Grokking Algorithms",
    author: "Aditya Bhargava",
    image: "https://images.manning.com/360/480/resize/book/3/0b325da-eb26-4e50-8a2a-46042c647083/Bhargava-Algorithms_hires.png",
  },
  {
    title: "Grokking Data Structures",
    author: "Marcello La Rocca",
    image: "https://images.manning.com/360/480/resize/book/c/d2857e4-0ccb-4758-b294-ddd56d1477fd/LaRocca-HI.png",
  },
  {
    title: "Grokking Deep Reinforcement Learning",
    author: "Miguel Morales",
    image: "https://images.manning.com/360/480/resize/book/0/71803bc-4b2a-4893-a312-23f7ae55a00f/Morales_DRL_hires.png",
  },
  {
    title: "Deep Learning for Vision Systems",
    author: "Mohamed Elgendy",
    image: "https://images.manning.com/360/480/resize/book/4/bc144d6-7bd7-4e4f-80db-482b69819225/Elgendy-DLVS-HI.png",
  },
]

export default function Portfolio() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "200%"])

  const [selectedProject, setSelectedProject] = useState<(typeof projects)[0] | null>(null)

  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })
  }

  const ProjectModal = ({ project, onClose }: { project: (typeof projects)[0]; onClose: () => void }) => (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-8">
            <div className="flex flex-col-reverse lg:flex-row gap-8">
              <div className="lg:w-1/2">
                <div className="grid grid-cols-1 gap-4">
                  {project.images.map((image, index) => (
                    <motion.div
                      key={index}
                      className="relative overflow-hidden rounded-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`${project.title} screenshot ${index + 1}`}
                        width={400}
                        height={300}
                        className="w-full h-auto object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="sticky top-20 lg:w-1/2">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl font-bold text-white">{project.title}</h2>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                    {project.status}
                  </span>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">{project.fullDescription}</p>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {project.features.map((feature, index) => (
                      <motion.li
                        key={index}
                        className="flex items-center text-gray-300"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 flex-shrink-0" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-3">Technologies Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  {project.liveUrl && (
                    <motion.a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Live
                    </motion.a>
                  )}
                  {/*project?.githubUrl && (
                    <motion.a
                      href={project?.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-300 border border-gray-600 hover:border-gray-500"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Github className="h-4 w-4" />
                      View Code
                    </motion.a>
                  )*/}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ y: backgroundY }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        </motion.div>

        <motion.div
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
          style={{ y: textY }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Hi, I'm Caleb-Livingstone Emmanuel 👋
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-gray-300 mb-8 font-light"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Fullstack Developer – React, Next.js, Flutter, Node.js
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Button
              onClick={scrollToProjects}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              View My Work
              <ArrowDown className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <ArrowDown className="h-6 w-6 text-gray-400" />
        </motion.div>
      </section>

      {/* About Me Section */}
      <section className="py-20 px-4 max-w-4xl mx-auto">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            variants={fadeInUp}
          >
            About Me
          </motion.h2>

          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700/50"
            variants={fadeInUp}
          >
            <p className="text-lg text-gray-300 leading-relaxed">
              I'm a passionate fullstack developer with extensive startup experience and a strong background in product
              leadership. I specialize in building end-to-end solutions that bridge the gap between innovative ideas and
              real-world applications. With expertise spanning React, Next.js, Flutter, and Node.js, I thrive on
              creating seamless user experiences and robust backend systems. My journey in the tech ecosystem has taught
              me the importance of scalable architecture, user-centric design, and the power of bringing diverse teams
              together to build products that matter.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-4 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-16 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              Things I've Built
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, index) => (
                <motion.div
                  key={project.title}
                  variants={fadeInUp}
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setSelectedProject(project)}
                  className="cursor-pointer"
                >
                  <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 h-full group">
                    <CardContent className="p-6">
                      <div className="relative overflow-hidden rounded-lg mb-4">
                        <Image
                          src={project.image || "/placeholder.svg"}
                          alt={project.title}
                          width={300}
                          height={200}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      <h3 className="text-xl font-bold mb-2 text-white group-hover:text-purple-400 transition-colors">
                        {project.title}
                      </h3>

                      <p className="text-gray-300 mb-4 text-sm leading-relaxed">{project.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {project.tech.map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Currently Reading Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-16 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              What I'm Reading
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {books.map((book, index) => (
                <motion.div
                  key={book.title}
                  variants={fadeInUp}
                  whileHover={{ y: -15, rotateY: 5 }}
                  transition={{ duration: 0.3 }}
                  className="group"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Card className="relative bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="relative overflow-hidden rounded-lg mb-4">
                          <Image
                            src={book.image || "/placeholder.svg"}
                            alt={book.title}
                            width={200}
                            height={300}
                            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <h3 className="font-bold text-white mb-1 text-sm leading-tight group-hover:text-purple-400 transition-colors">
                          {book.title}
                        </h3>

                        <p className="text-gray-400 text-xs">{book.author}</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 bg-gray-800/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              Let's Connect
            </motion.h2>

            <motion.p className="text-xl text-gray-300 mb-12" variants={fadeInUp}>
              I'm always open to discussing new opportunities and interesting projects.
            </motion.p>

            <motion.div className="flex justify-center space-x-6" variants={fadeInUp}>
              {[
                { icon: Mail, href: "mailto:emmanuelcaleblivingstone@gmail.com", label: "Email" },
                { icon: Twitter, href: "https://x.com/caystone_99", label: "Twitter" },
                { icon: Linkedin, href: "https://www.linkedin.com/in/caystone/", label: "LinkedIn" },
                { icon: Github, href: "https://github.com/Caystone99", label: "GitHub" },
              ].map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 group"
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-6 w-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  <span className="sr-only">{label}</span>
                </motion.a>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} Caleb-Livingstone Emmanuel. Made with 🤟🏼.
          </p>
        </div>
      </footer>

      {/* Project Modal */}
      {selectedProject && <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  )
}
