"use client"

import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowLeft, Clock } from "lucide-react"

const blogPosts = [
  {
    id: 1,
    slug: "future-of-african-innovation",
    title: "The Future of African Innovation",
    excerpt:
      "Exploring how young leaders are driving technological advancement across the continent through groundbreaking solutions and creative thinking.",
    content: `
      <p>Africa stands at the precipice of a technological revolution, driven by the innovative minds of its young leaders. From Lagos to Nairobi, from Cape Town to Cairo, a new generation of entrepreneurs and innovators is reshaping the continent's future.</p>
      
      <h2>The Rise of Tech Hubs</h2>
      <p>Across Africa, tech hubs are emerging as centers of innovation and creativity. These spaces provide young entrepreneurs with the resources, mentorship, and networks they need to turn their ideas into reality. Cities like Lagos, Nairobi, and Cape Town have become synonymous with technological advancement.</p>
      
      <h2>Solving Local Problems</h2>
      <p>What sets African innovation apart is its focus on solving local problems. From mobile banking solutions that serve the unbanked to agricultural technologies that help smallholder farmers, African innovators are creating solutions that have global impact.</p>
      
      <h2>The Role of Education</h2>
      <p>Education plays a crucial role in fostering innovation. Universities and educational institutions across Africa are adapting their curricula to meet the demands of the digital age, producing graduates who are ready to tackle the challenges of tomorrow.</p>
      
      <p>As we look to the future, it's clear that Africa's young leaders will continue to drive innovation and create solutions that not only benefit the continent but the world at large.</p>
    `,
    date: "December 15, 2024",
    author: "Dr. Amina Hassan",
    category: "Innovation",
    image: "/placeholder.svg?key=blog1",
    readTime: "5 min read",
  },
  {
    id: 2,
    slug: "building-sustainable-communities",
    title: "Building Sustainable Communities",
    excerpt:
      "How our 2024 awardees are creating lasting environmental and social impact in their local communities through innovative approaches.",
    content: `
      <p>Sustainability is not just a buzzword for Africa's future leaders—it's a way of life. Our 2024 awardees are demonstrating that environmental consciousness and social responsibility can go hand in hand with economic development.</p>
      
      <h2>Environmental Innovation</h2>
      <p>From renewable energy projects to waste management solutions, young African leaders are pioneering environmental innovations that address local challenges while contributing to global sustainability goals.</p>
      
      <h2>Community-Centered Approaches</h2>
      <p>The most successful sustainability initiatives in Africa are those that put communities at the center. Our awardees understand that lasting change comes from working with communities, not for them.</p>
      
      <h2>Economic Sustainability</h2>
      <p>True sustainability must be economically viable. African leaders are creating business models that generate profit while creating positive environmental and social impact.</p>
      
      <p>The future of Africa depends on leaders who understand that economic growth and environmental protection are not mutually exclusive but mutually reinforcing.</p>
    `,
    date: "December 10, 2024",
    author: "Prof. Kwame Asante",
    category: "Sustainability",
    image: "/placeholder.svg?key=blog2",
    readTime: "7 min read",
  },
  {
    id: 3,
    slug: "mentorship-that-transforms",
    title: "Mentorship That Transforms",
    excerpt:
      "The power of mentorship in shaping Africa's future leaders and creating networks that span across borders and industries.",
    content: `
      <p>Mentorship is the secret ingredient that transforms potential into achievement. Across Africa, experienced leaders are investing their time and wisdom in the next generation, creating a ripple effect of positive change.</p>
      
      <h2>The Mentorship Ecosystem</h2>
      <p>Africa's mentorship ecosystem is diverse and dynamic, encompassing formal programs, informal relationships, and peer-to-peer learning networks that span across industries and borders.</p>
      
      <h2>Cross-Border Collaboration</h2>
      <p>Modern mentorship in Africa transcends geographical boundaries. Digital platforms and international programs are connecting mentors and mentees across the continent and beyond.</p>
      
      <h2>Industry-Specific Guidance</h2>
      <p>From technology to healthcare, from agriculture to finance, industry-specific mentorship programs are helping young leaders navigate the complexities of their chosen fields.</p>
      
      <h2>The Multiplier Effect</h2>
      <p>The most powerful aspect of mentorship is its multiplier effect. Today's mentees become tomorrow's mentors, creating a continuous cycle of knowledge transfer and leadership development.</p>
      
      <p>As Africa continues to rise, mentorship will remain a cornerstone of leadership development, ensuring that each generation builds upon the achievements of those who came before.</p>
    `,
    date: "December 5, 2024",
    author: "Sarah Okonkwo",
    category: "Leadership",
    image: "/placeholder.svg?key=blog3",
    readTime: "4 min read",
  },
]

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Navigation */}
      <div className="container mx-auto px-4 py-6">
        <Link href="/#blog">
          <Button variant="ghost" className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
        </Link>
      </div>

      {/* Hero Image */}
      <div className="relative h-96 mb-8">
        <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-6 left-6">
          <Badge className="bg-orange-500/90 text-white backdrop-blur-sm mb-4">{post.category}</Badge>
        </div>
      </div>

      {/* Article Content */}
      <article className="container mx-auto px-4 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300 text-balance">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-zinc-400 mb-6">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{post.readTime}</span>
            </div>
          </div>

          <p className="text-xl text-zinc-300 text-pretty leading-relaxed">{post.excerpt}</p>
        </header>

        <div
          className="prose prose-lg prose-invert prose-orange max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Call to Action */}
        <div className="mt-12 p-8 bg-zinc-900/50 rounded-2xl border border-orange-400/20">
          <h3 className="text-2xl font-bold mb-4 text-orange-300">Join the Movement</h3>
          <p className="text-zinc-300 mb-6">
            Be part of Africa's transformation. Connect with other future leaders and make your impact.
          </p>
          <Link href="/#contact">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Get Involved</Button>
          </Link>
        </div>
      </article>

      {/* Footer spacing */}
      <div className="h-20" />
    </div>
  )
}
