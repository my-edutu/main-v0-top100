export type BlogContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; intro?: string; items: string[] }
  | { type: 'cta'; text: string; href?: string }

export interface BlogPost {
  id: string
  title: string
  slug: string
  author: string
  excerpt: string
  content: BlogContentBlock[]
  tags: string[]
  coverImage?: string
  createdAt: string
  updatedAt: string
  readTime: number
  isFeatured: boolean
  status: 'published' | 'draft'
}

export const blogPosts: BlogPost[] = [
  {
    id: "from-first-class-graduate-to-global-leader",
    title: "From First-Class Graduate to Global Leader: Lessons from Top100 Awardees",
    slug: "from-first-class-graduate-to-global-leader",
    author: "Top100 Africa Future Leaders",
    excerpt:
      "First-class degrees are only the beginning - discover how Top100 awardees turn academic excellence into mentorship, advocacy, innovation, and community impact across the continent.",
    content: [
      {
        type: "paragraph",
        text: "In Africa, graduating with a first-class degree is a mark of resilience. It is not just about high grades; it is about discipline, sacrifice, and vision. But for many of our awardees, first-class honours were only the starting line.",
      },
      {
        type: "paragraph",
        text: "Through Top100, we have seen how first-class graduates transform their brilliance into global leadership impact. Their journeys hold lessons for every young African aspiring to rise.",
      },
      {
        type: "heading",
        text: "Example 1: The Scholar Who Became a Global Fellow",
      },
      {
        type: "paragraph",
        text: "One awardee, a first-class graduate in Engineering from Nigeria, did not stop at academic success. Leveraging mentorship and networks from Top100, he applied for international fellowships and was accepted into programmes that connected him with innovators across the world. Lesson: Excellence opens doors, but courage to apply makes you walk through them.",
      },
      {
        type: "heading",
        text: "Example 2: The Advocate Who Spoke on Global Stages",
      },
      {
        type: "paragraph",
        text: "A first-class law graduate from Ghana, celebrated in our 2024 cohort, went on to represent youth voices at United Nations events. What stood out was not only her academic brilliance but her passion for justice and equity. She used her voice to push for policy reforms affecting young women. Lesson: Your degree gives credibility, but your voice gives influence.",
      },
      {
        type: "heading",
        text: "Example 3: The Innovator Who Built Solutions",
      },
      {
        type: "paragraph",
        text: "From Kenya, a computer science graduate with distinction turned his project work into a startup solving real problems in agriculture. With the visibility gained through Top100, he connected with investors and scaled his idea beyond his country. Lesson: Innovation happens when you turn knowledge into solutions that serve communities.",
      },
      {
        type: "heading",
        text: "Example 4: The Changemaker Who Gave Back",
      },
      {
        type: "paragraph",
        text: "One of our Nigerian awardees, graduating top of her class in the medical sciences, chose not to leave her community behind. She co-founded an NGO to mentor secondary school students, guiding them through career choices and exam preparation. Lesson: Leadership is not about titles but about lifting others as you rise.",
      },
      {
        type: "paragraph",
        text: "Across these stories, one theme repeats: academic brilliance is only the seed. It is the mindset, vision, and willingness to step beyond comfort zones that transform a graduate into a leader.",
      },
      {
        type: "list",
        intro: "Key takeaways:",
        items: [
          "Network deeply - peers and mentors multiply opportunities.",
          "Apply boldly - fellowships, scholarships, and conferences exist, but only for those who take the leap.",
          "Serve locally - global recognition comes faster when your work impacts real lives at home.",
          "Stay consistent - leadership is built day by day, not overnight.",
        ],
      },
      {
        type: "heading",
        text: "Final Word",
      },
      {
        type: "paragraph",
        text: "Top100 Africa Future Leaders celebrates first-class graduates not just for their GPAs, but for the impact they create. Their journeys remind us that Africa's future is not written in classrooms alone - it is written in how graduates use their knowledge to lead, inspire, and transform.",
      },
      {
        type: "cta",
        text: "If you are reading this, let their stories push you: your certificate is not the end, it is the beginning of your impact journey.",
      },
    ],
    tags: ["Leadership", "First-Class Graduates", "Inspiration"],
    coverImage: "/placeholder.svg?key=blog-first-class",
    createdAt: "2024-10-05T00:00:00Z",
    updatedAt: "2024-10-05T00:00:00Z",
    readTime: 7,
    isFeatured: true,
    status: "published",
  },
  {
    id: "the-power-of-peer-networks",
    title: "The Power of Peer Networks: Building Communities that Inspire Growth",
    slug: "the-power-of-peer-networks",
    author: "Top100 Africa Future Leaders",
    excerpt:
      "Peer networks are more than friendships - they are ecosystems of collaboration, opportunity, and collective uplift for Africa's young leaders.",
    content: [
      {
        type: "paragraph",
        text: "In today's Africa, young people face enormous challenges - from limited opportunities to overwhelming competition in schools and workplaces. Yet, one truth remains: we grow faster together than alone.",
      },
      {
        type: "paragraph",
        text: "A peer network is more than just friends or classmates. It is a community of like-minded people who share ideas, push one another forward, and inspire each other to rise higher.",
      },
      {
        type: "heading",
        text: "Learning From Each Other",
      },
      {
        type: "paragraph",
        text: "When a student meets another who has secured a global scholarship, suddenly the dream no longer feels impossible. When one young entrepreneur shares how they launched a startup with limited resources, others see that it can be done.",
      },
      {
        type: "paragraph",
        text: "Inside Top100, we have witnessed this firsthand: awardees sharing application tips, peers opening internship doors, and leaders cheering one another to finish projects and publish research.",
      },
      {
        type: "heading",
        text: "A Culture of Inspiration",
      },
      {
        type: "paragraph",
        text: "Peer networks work because they foster a culture where success is shared, not hoarded. One person's breakthrough becomes the blueprint for another's journey.",
      },
      {
        type: "paragraph",
        text: "At the 2024 Africa Future Leaders Summit, awardees from over 20 countries came together virtually. The energy was undeniable. Students who once thought they were ordinary realised they were part of a continental community of extraordinary achievers.",
      },
      {
        type: "heading",
        text: "Beyond Friendship: Real Opportunities",
      },
      {
        type: "paragraph",
        text: "Strong peer networks do not only inspire - they open doors. Within Top100, young leaders have found co-founders, discovered scholarships through word-of-mouth, and partnered across borders to scale social impact projects.",
      },
      {
        type: "heading",
        text: "Building Communities that Last",
      },
      {
        type: "list",
        intro: "Build your peer community with intention:",
        items: [
          "Celebrate each other's wins.",
          "Share knowledge and resources freely.",
          "Create safe spaces for questions, mistakes, and growth.",
          "Stay consistent - a community dies when it goes silent.",
        ],
      },
      {
        type: "heading",
        text: "The Top100 Example",
      },
      {
        type: "paragraph",
        text: "Top100 Africa Future Leaders is built on this principle. With 400 plus awardees across the continent, every connection is an opportunity to learn, teach, or collaborate. Project100 Scholarship, Talk100 Live, and the Opportunities Hub thrive because peers choose to lift one another.",
      },
      {
        type: "heading",
        text: "Final Word",
      },
      {
        type: "paragraph",
        text: "If you want to go fast, go alone. If you want to go far, go together. The future of Africa depends on young leaders who not only rise but also lift others as they climb.",
      },
    ],
    tags: ["Community", "Networks", "Collaboration"],
    coverImage: "/placeholder.svg?key=blog-peer-networks",
    createdAt: "2024-10-12T00:00:00Z",
    updatedAt: "2024-10-12T00:00:00Z",
    readTime: 6,
    isFeatured: true,
    status: "published",
  },
  {
    id: "one-young-world-partners-with-top100",
    title: "One Young World West & Central Africa Partners with Top100 Africa Future Leaders",
    slug: "one-young-world-partners-with-top100",
    author: "Top100 Africa Future Leaders",
    excerpt:
      "A strategic alliance with One Young World West and Central Africa connects Top100 awardees to global platforms, mentorship, and amplified storytelling.",
    content: [
      {
        type: "paragraph",
        text: "At the heart of both One Young World and Top100 Africa Future Leaders lies a shared belief: young people are not just the leaders of tomorrow - they are the leaders of today.",
      },
      {
        type: "paragraph",
        text: "We are proud to announce a strategic partnership with the One Young World West and Central Africa ambassador community. This collaboration amplifies youth voices, expands opportunities, and connects African changemakers to a global stage.",
      },
      {
        type: "heading",
        text: "Why This Matters",
      },
      {
        type: "paragraph",
        text: "Top100 was created to identify, celebrate, and empower Africa's brightest undergraduates and young professionals. Since our 2024 Empowerment Summit, we have profiled over 400 awardees, launched Project100 Scholarship, and built platforms like Talk100 Live and the Opportunities Hub.",
      },
      {
        type: "paragraph",
        text: "One Young World convenes thousands of young leaders alongside heads of state, CEOs, and humanitarians each year. By joining forces, we ensure the brilliance of African youth is celebrated locally and projected globally.",
      },
      {
        type: "heading",
        text: "What the Partnership Delivers",
      },
      {
        type: "list",
        items: [
          "Amplified voices across the OYW ambassador network.",
          "A richer pipeline of fellowships, scholarships, and global events.",
          "Co-hosted dialogues that link Talk100 Live with OYW-led programmes.",
          "Mentorship bridges between awardees, Project100 scholars, and OYW ambassadors.",
          "Stronger representation of West and Central African youth on the OYW global stage.",
        ],
      },
      {
        type: "paragraph",
        text: "This partnership is about connecting Africa's future leaders with a global ecosystem. Our awardees deserve to be seen not only in their local communities but across the world. - Nwosu Paul Light, Founder, Top100 Africa Future Leaders.",
      },
      {
        type: "paragraph",
        text: "The OYW ambassador network in West and Central Africa is committed to ensuring that young voices are heard in decision-making spaces. Partnering with Top100 is a natural step to scale this mission. - OYW West and Central Africa Leadership.",
      },
      {
        type: "list",
        intro: "What comes next:",
        items: [
          "Joint leadership dialogues featuring Top100 awardees and OYW ambassadors.",
          "Expanded scholarship and fellowship access through the Opportunities Hub.",
          "Collaborative storytelling through the Top100 Magazine and OYW channels.",
          "Stronger youth representation at the global One Young World Summit.",
        ],
      },
      {
        type: "cta",
        text: "Together with One Young World, Top100 Africa Future Leaders is shaping a future where African youth are not just included - they are leading the conversation.",
        href: "/partnerships/one-young-world",
      },
    ],
    tags: ["Partnerships", "One Young World", "Global"],
    coverImage: "/placeholder.svg?key=blog-oyw",
    createdAt: "2024-10-19T00:00:00Z",
    updatedAt: "2024-10-19T00:00:00Z",
    readTime: 5,
    isFeatured: true,
    status: "published",
  },
  {
    id: "learning-planet-institute-partners-with-top100",
    title: "Learning Planet Institute Paris Joins as a Partner for Top100 Africa Future Leaders",
    slug: "learning-planet-institute-partners-with-top100",
    author: "Top100 Africa Future Leaders",
    excerpt:
      "Top100 and the Learning Planet Institute are uniting to reimagine education, leadership, and sustainability through collaborative programmes and global visibility.",
    content: [
      {
        type: "paragraph",
        text: "The journey of Top100 Africa Future Leaders has always been guided by one mission: to identify, celebrate, and empower Africa's brightest young leaders.",
      },
      {
        type: "paragraph",
        text: "We are delighted to announce that the Learning Planet Institute in Paris has joined us as an official partner, reinforcing our shared commitment to education, leadership, and sustainable change.",
      },
      {
        type: "heading",
        text: "Why This Partnership Matters",
      },
      {
        type: "paragraph",
        text: "Top100 profiles outstanding students and young changemakers across Africa, launches initiatives like Project100 Scholarship, and hosts platforms such as Talk100 Live and the Opportunities Hub.",
      },
      {
        type: "paragraph",
        text: "The Learning Planet Institute is a world-renowned hub for transformative education, innovation, and collaboration. Together, we can connect Africa's young leaders to global networks of educators and innovators.",
      },
      {
        type: "heading",
        text: "What We Will Deliver Together",
      },
      {
        type: "list",
        items: [
          "Capacity building through training, mentorship, and knowledge sharing.",
          "Global visibility for youth-led solutions in international learning spaces.",
          "Co-designed programmes tackling education, sustainability, and leadership challenges.",
          "Opportunities for Project100 scholars and awardees to participate in Learning Planet initiatives.",
        ],
      },
      {
        type: "paragraph",
        text: "We are excited to welcome the Learning Planet Institute as a partner. Their vision for reimagining education perfectly aligns with our mission to empower Africa's next generation of leaders. - Nwosu Paul Light.",
      },
      {
        type: "paragraph",
        text: "At Learning Planet, we believe in collective intelligence and global collaboration. Partnering with Top100 allows us to connect with a vibrant community of young Africans who are already shaping the future. - Learning Planet Institute Paris.",
      },
      {
        type: "cta",
        text: "Together, we are proving that when Africa's brightest minds connect with the world's most innovative institutions, the future of leadership becomes limitless.",
      },
    ],
    tags: ["Partnerships", "Education", "Global"],
    coverImage: "/placeholder.svg?key=blog-learning-planet",
    createdAt: "2024-10-26T00:00:00Z",
    updatedAt: "2024-10-26T00:00:00Z",
    readTime: 5,
    isFeatured: false,
    status: "published",
  },
  {
    id: "why-africas-future-depends-on-youth-leadership-today",
    title: "Why Africa's Future Depends on Youth Leadership Today",
    slug: "why-africas-future-depends-on-youth-leadership-today",
    author: "Top100 Africa Future Leaders",
    excerpt:
      "Africa is the world's youngest continent - its rise hinges on how intentionally we empower young leaders to innovate, advocate, and build today.",
    content: [
      {
        type: "paragraph",
        text: "Africa is the world's youngest continent. More than 60 percent of its population is under the age of 25. This is not just a statistic - it is a defining reality.",
      },
      {
        type: "paragraph",
        text: "If Africa is to rise, it must rise on the shoulders of its youth. That rise will depend on whether we prepare leaders who can think, innovate, and act boldly today - not tomorrow.",
      },
      {
        type: "heading",
        text: "Beyond Tomorrow's Leaders",
      },
      {
        type: "paragraph",
        text: "Too often, African youth are described as leaders of tomorrow. But tomorrow is already here. Young Africans are founding startups, leading climate campaigns, securing global scholarships, and building NGOs like Project100 Scholarship to keep children in school.",
      },
      {
        type: "heading",
        text: "The Top100 Lesson",
      },
      {
        type: "paragraph",
        text: "In 2024 alone, we profiled over 400 awardees across Africa who are creating opportunities, mentoring peers, and representing the continent on global stages. When youth lead, communities grow stronger.",
      },
      {
        type: "heading",
        text: "Why It Matters",
      },
      {
        type: "list",
        items: [
          "Demographics: Africa's greatest asset is its youth.",
          "Innovation: Young Africans are driving solutions that can scale globally.",
          "Global representation: Youth leaders bring African voices into international rooms.",
          "Sustainability: Education and empowerment today mean fewer crises tomorrow.",
        ],
      },
      {
        type: "heading",
        text: "A Call to Action",
      },
      {
        type: "paragraph",
        text: "Africa cannot afford to treat youth as an afterthought. Governments, private sector players, and global partners must invest intentionally in youth leadership through scholarships, dialogues, funding, and mentorship.",
      },
      {
        type: "cta",
        text: "If we invest in youth leadership today, Africa will not only catch up with the world - it will lead it. That is why Top100 celebrates brilliance, amplifies voices, and empowers the next generation to shape Africa's tomorrow, today.",
      },
    ],
    tags: ["Youth Leadership", "Future of Work", "Policy"],
    coverImage: "/placeholder.svg?key=blog-youth-leadership",
    createdAt: "2024-11-02T00:00:00Z",
    updatedAt: "2024-11-02T00:00:00Z",
    readTime: 6,
    isFeatured: false,
    status: "published",
  },
  {
    id: "meet-paul-nwosu-light",
    title: "Meet Paul Nwosu Light: The Visionary Founder Behind Top100 Africa Future Leaders",
    slug: "meet-paul-nwosu-light",
    author: "Top100 Africa Future Leaders",
    excerpt:
      "Discover the story of Paul Nwosu Light - engineer, youth advocate, and visionary founder of Top100 Africa Future Leaders - whose dream is to elevate Africa's brightest minds.",
    content: [
      {
        type: "paragraph",
        text: "At the heart of Top100 Africa Future Leaders is a young Nigerian leader with a bold dream: to identify, celebrate, and empower Africa's brightest students and young changemakers.",
      },
      {
        type: "paragraph",
        text: "That leader is Paul Nwosu Light - an engineer by training, a youth advocate by calling, and a visionary who believes Africa's future depends on how well it invests in its young people today.",
      },
      {
        type: "heading",
        text: "From Classroom Leadership to Continental Impact",
      },
      {
        type: "paragraph",
        text: "Paul's journey began during his undergraduate years at Nnamdi Azikiwe University, where he served as Class President in the Department of Metallurgical and Materials Engineering from 2018 to 2023.",
      },
      {
        type: "paragraph",
        text: "Leading his peers gave him firsthand experience of the potential and challenges that African students face. Rather than stop at campus leadership, he imagined a continental platform spotlighting young Africans who excel in academics, leadership, and innovation.",
      },
      {
        type: "heading",
        text: "The Birth of Top100 Africa Future Leaders",
      },
      {
        type: "paragraph",
        text: "In 2023, Paul launched Top100 Africa Future Leaders. Within a year, the movement profiled over 400 awardees across Africa, hosted the Africa Future Leaders Empowerment Summit, and activated initiatives that funnel resources to brilliant students.",
      },
      {
        type: "heading",
        text: "Beyond Recognition: Building Platforms for Growth",
      },
      {
        type: "list",
        items: [
          "Project100 Scholarship sends disadvantaged children from street to school.",
          "Talk100 Live convenes monthly conversations with policymakers and pioneers.",
          "Future Leaders Summit gathers awardees, partners, and investors.",
          "The Opportunities Hub (powered by Edutu) curates scholarships, internships, and fellowships.",
          "Top100 Magazine documents the journeys and impact of Africa's rising generation.",
        ],
      },
      {
        type: "heading",
        text: "A Visionary for Africa's Future",
      },
      {
        type: "paragraph",
        text: "Paul believes leadership is not about titles but about influence, intellect, and impact. His dream is to see an Africa where every brilliant student has the tools, networks, and confidence to become a global leader.",
      },
      {
        type: "paragraph",
        text: "Beyond Top100, Paul is a self-published author, a budding AI engineer, and a passionate advocate for education and youth empowerment. He collaborates with organisations including One Young World West and Central Africa, Learning Planet Institute Paris, Mastercard Foundation communities, and ALX Africa.",
      },
      {
        type: "cta",
        text: "The story of Paul Nwosu Light is the story of what is possible when a young leader decides to dream boldly and act consistently. Through Top100, he is shaping not only his own legacy but the future of an entire continent.",
      },
    ],
    tags: ["Leadership", "Founder Story", "Inspiration"],
    coverImage: "/placeholder.svg?key=blog-paul-light",
    createdAt: "2024-11-09T00:00:00Z",
    updatedAt: "2024-11-09T00:00:00Z",
    readTime: 7,
    isFeatured: false,
    status: "published",
  },
]

export const featuredBlogPosts = blogPosts.filter((post) => post.isFeatured)




