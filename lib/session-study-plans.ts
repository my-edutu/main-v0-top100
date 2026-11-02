export interface SessionStudyPlan {
  title: string
  introduction: string
  modules: Array<{
    title: string
    sections: Array<{ title: string; points: string[]; ordered?: boolean }>
  }>
}

export const recognitionToLeadershipStudyPlan: SessionStudyPlan = {
  title: 'From Recognition to Leadership',
  introduction: 'Study the core leadership concepts presented by Amos Ologunleko. Work through the five modules, then take the session quiz to review your understanding.',
  modules: [
    {
      title: 'Foundations of Recognition and Leadership',
      sections: [
        {
          title: 'Recognition vs. Leadership vs. Impact',
          points: [
            'Personal academic or career achievements, such as graduating first class or earning awards, set a high baseline standard. Recognition itself is temporary, external, and momentary.',
            'Personal responsibility precedes public recognition.',
            'Leadership means delivering sustained impact at scale rather than relying on titles, positions, or external authority.',
          ],
        },
        {
          title: 'Characteristics of Positive Recognition',
          points: ['Positive recognition must be specific, evidence-based, timely, sincere, equitable, and aligned with core values to build trust—the currency of leadership.'],
        },
        {
          title: 'Voice vs. Choice',
          points: ['Contrast the “voice of recognition”—external accolades that fluctuate—with the “choice of leadership”: internal resolve, resilience, and personal capability.'],
        },
      ],
    },
    {
      title: 'The Three Dimensions of Leadership Development',
      sections: [
        {
          title: '1. Influence (The Foundation)',
          points: [
            'Core question: “Can I be trusted? Can I be heard?”',
            'Build credibility through evidence and clearly communicate a compelling vision—the “picture of the future you want to feature in”—to gain followers.',
          ],
        },
        {
          title: '2. Inspiration (The Driver)',
          points: [
            'Core question: “Do people want to follow me?”',
            'Define clear purpose and role-model expected behaviors to build true engagement rather than mere compliance.',
          ],
        },
        {
          title: '3. Impact (The Ultimate Goal)',
          points: [
            'Core question: “What has durably changed?”',
            'Leave your environment better through disciplined execution, operationalizing systems, and creating multiplier effects.',
          ],
        },
      ],
    },
    {
      title: 'Self-Awareness & Continuous Growth',
      sections: [
        {
          title: 'The Self-Awareness Gap',
          points: ['True self-awareness requires evaluating both internal values—your moral compass—and external perception: how others interpret your values.'],
        },
        {
          title: 'Feedback and Measurement',
          points: ['Apply the principle: “What you don’t know you can’t improve, and what you don’t measure you can’t control.”'],
        },
        {
          title: 'Actionable Gap Analysis',
          ordered: true,
          points: [
            'Assess current reality versus leadership goals.',
            'Perform a gap analysis.',
            'Formulate disciplined action plans with concrete timeframes, from 3 months to 10 years.',
            'Commit to lifelong learning through continuous feedback, reading, and mentorship.',
          ],
        },
      ],
    },
    {
      title: 'The Leadership Fire Triangle Model',
      sections: [
        {
          title: 'Three Essential Components',
          points: [
            'Passion (Fuel): Provides the “why” and purpose, keeping you resilient during adversity.',
            'Ability (Ignition Source): Provides the technical skills, soft skills, character, and competence that grant the “right” to lead.',
            'Connection (Oxygen/Air): Provides the network—associates, leaders, and clients—required to gain reach and influence.',
          ],
        },
        {
          title: 'Leadership Diagnosis Matrix: Analyzing Misalignments',
          points: [
            'High Passion + High Ability + Low Connection: Produces brilliant results, but teams feel disengaged due to unapproachability.',
            'High Passion + High Connection + Low Ability: Inspiring, but lacks execution credibility, leading to weak execution and difficulty coaching others.',
            'High Ability + High Connection + Low Passion: Leads to a competent caretaker who remains stagnant and fails to drive transformation.',
            'High Passion + High Ability + High Connection (Optimal State): Creates complete combustion (“blue flame”), enabling sustainable, trusted leadership and transformational impact.',
          ],
        },
      ],
    },
    {
      title: 'Practical Application & Leadership Navigation',
      sections: [
        {
          title: 'Intentionality in Work and Life',
          points: ['Define workplace success as putting leadership into action, using competence to deliver secure and outstanding results.'],
        },
        {
          title: 'Managing High-Paced & Distracting Environments',
          points: [
            'Use a clear personal vision as a compass to filter important tasks from distractions.',
            'Use mentors and coaches to stay grounded while technology evolves.',
          ],
        },
        {
          title: 'Leading Initiatives & Community Projects',
          points: [
            'Resource Realism: Count the cost before starting ventures; scale according to available resources to avoid burnout.',
            'Shared Vision & Coalition: Find aligned partners and sponsors rather than seeking general approval or relying solely on personal funds.',
            'Personal Self-Leadership: Focus first on leading yourself effectively as a precondition to leading others.',
          ],
        },
      ],
    },
  ],
}
