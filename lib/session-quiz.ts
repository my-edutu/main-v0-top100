export interface SessionQuiz {
  questions: Array<{
    id: string
    prompt: string
    options: string[]
    correctAnswer: number
    explanation?: string
  }>
  discussions: Array<{
    id: string
    title: string
    prompt: string
    modelAnswer: string
  }>
}

export const knowledgeToImpactQuiz: SessionQuiz = {
  questions: [
    {
      id: 'hedgehog',
      prompt: 'What is the main idea behind the “Hedgehog Concept”?',
      options: [
        'Trying multiple approaches until one works',
        'Focusing deeply on mastering one specific area of strength',
        'Adapting to every available opportunity',
        'Prioritizing weak areas to achieve balanced growth',
      ],
      correctAnswer: 1,
    },
    {
      id: 'art-of-war',
      prompt: 'In Sun Tzu’s The Art of War, what leads to total victory when addressing a challenge?',
      options: [
        'Knowing neither yourself nor the problem',
        'Knowing yourself but not knowing the problem',
        'Knowing both yourself and the problem',
        'Relying on external support to tackle the problem',
      ],
      correctAnswer: 2,
    },
    {
      id: 'purposeful-work',
      prompt: 'According to the “Four Quads of Purposeful Work,” which two elements combine to form a standard “Job”?',
      options: ['Purpose + Passion', 'Skill + Profit', 'Passion + Skill', 'Purpose + Profit'],
      correctAnswer: 1,
    },
    {
      id: 'five-whys',
      prompt: 'What is the primary purpose of using the “5 Whys” methodology?',
      options: [
        'To brainstorm new product features',
        'To perform a root cause analysis of a problem',
        'To evaluate customer satisfaction levels',
        'To determine the pricing model for a service',
      ],
      correctAnswer: 1,
    },
    {
      id: 'errc',
      prompt: 'In the ERRC Strategy Framework, what does the acronym stand for?',
      options: [
        'Evaluate, Reduce, Reform, Create',
        'Eliminate, Reduce, Raise, Create',
        'Eliminate, Refine, Raise, Capitalize',
        'Execute, Reduce, Rebuild, Create',
      ],
      correctAnswer: 1,
    },
  ],
  discussions: [
    {
      id: 'iceberg',
      title: 'The Iceberg Model',
      prompt: 'Explain how the Iceberg Model helps in identifying the root causes of systemic problems rather than just addressing surface-level symptoms.',
      modelAnswer: 'It pushes beyond the surface event to analyze underlying patterns and trends, structural drivers, and mental models sustaining the issue, preventing temporary or ineffective fixes.',
    },
    {
      id: 'prioritization',
      title: 'Prioritization Grid',
      prompt: 'When evaluating generated ideas, what type of ideas represent the optimal “sweet spot” for a business, and why?',
      modelAnswer: 'High-impact, low-effort ideas are preferred because they minimize operational costs while maximizing return and efficiency.',
    },
    {
      id: 'team',
      title: 'Team Building (“First Then What” Principle)',
      prompt: 'Why is it crucial to have the right team members on board before finalizing direction or scaling a project?',
      modelAnswer: 'The right team members are intrinsically motivated to do quality work, and they will adapt and remain committed even if the project’s strategic direction changes.',
    },
  ],
}

export const recognitionToLeadershipQuiz: SessionQuiz = {
  questions: [
    {
      id: 'recognition-leadership',
      prompt: 'According to the speaker, what is the key difference between recognition and leadership?',
      options: [
        'Recognition is permanent, while leadership is temporary.',
        'Recognition relies on internal choices, while leadership comes from external accolades.',
        'Recognition is a temporary, external accolade, while leadership is about choices, capability, and delivering sustained impact.',
        'Leadership is tied directly to high academic standing, whereas recognition requires holding a formal title.',
      ],
      correctAnswer: 2,
      explanation: 'Leadership is about delivering impact through choices and capability, whereas recognition is temporary and external.',
    },
    {
      id: 'influence',
      prompt: 'In the three dimensions of leadership development, which stage answers the question: “Can I be trusted? Can I be heard?”',
      options: ['Influence', 'Inspiration', 'Impact', 'Inclusion'],
      correctAnswer: 0,
      explanation: 'Influence forms the foundational stage addressing trust and credibility.',
    },
    {
      id: 'inspiration',
      prompt: 'What happens if a leader skips the Inspiration phase of leadership development?',
      options: [
        'They will have no followers at all.',
        'People will only comply out of positional authority, rather than true engagement.',
        'They will immediately achieve a high multiplier effect.',
        'The team will experience complete burnt-out combustion.',
      ],
      correctAnswer: 1,
      explanation: 'Without inspiration, followers only comply out of positional duty rather than shared purpose.',
    },
    {
      id: 'self-awareness',
      prompt: 'According to research cited by the speaker, what percentage of people who believe they are self-aware actually are?',
      options: ['85% to 90%', '50%', '10% to 15%', '30%'],
      correctAnswer: 2,
      explanation: 'The speaker cited research suggesting that only 10% to 15% of people are genuinely self-aware, despite most assuming they are.',
    },
    {
      id: 'ignition-source',
      prompt: 'In the Leadership Fire Triangle Model, what component acts as the “ignition source”?',
      options: ['Passion', 'Connection', 'Ability', 'Vision'],
      correctAnswer: 2,
      explanation: 'Ability—skills, competence, and character—provides the ignition source in the fire triangle.',
    },
    {
      id: 'low-ability',
      prompt: 'A leader who possesses High Passion and High Connection, but has Low Ability, typically produces what type of dynamic?',
      options: [
        'An unapproachable team that produces disengaged members.',
        'An inspiring team dynamic that suffers from weak execution due to a lack of technical credibility.',
        'A stagnant, “competent caretaker” environment.',
        'A sustainable, trust-based transformational culture.',
      ],
      correctAnswer: 1,
      explanation: 'High passion and connection without ability creates inspiration without execution credibility.',
    },
    {
      id: 'blue-flame',
      prompt: 'What three elements align to create the optimal state of leadership (“complete combustion” or “blue flame”)?',
      options: [
        'Title, Authority, and Control',
        'Passion, Ability, and Connection',
        'Recognition, Academic Standing, and Vision',
        'Discipline, Feedback, and Systems',
      ],
      correctAnswer: 1,
      explanation: 'Aligning Passion, Ability, and Connection creates the “blue flame” of sustainable leadership impact.',
    },
    {
      id: 'community-resources',
      prompt: 'What advice did the speaker give to a participant struggling with running out of personal financial resources while executing a community initiative?',
      options: [
        'Take out personal loans to finish the project as fast as possible.',
        'Focus on applause and recognition to attract instant funding.',
        'Count the cost before starting, pause to evaluate resources, and seek out sponsors and partners who share the vision.',
        'Abandon the project permanently, as leadership cannot be practiced at a local community level.',
      ],
      correctAnswer: 2,
      explanation: 'The speaker emphasized counting the cost, scaling within available means, and building network coalitions rather than draining personal funds.',
    },
  ],
  discussions: [],
}
