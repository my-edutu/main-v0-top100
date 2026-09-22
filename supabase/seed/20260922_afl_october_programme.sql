-- Africa Future Leaders — October 2026 virtual programme
-- Safe to re-run: event slugs are stable and the rows are public only when the
-- operator explicitly runs this seed in a demo or staging environment.

insert into public.events (
  slug, title, subtitle, summary, description, location, is_virtual,
  start_at, end_at, registration_label, featured_image_url, status, visibility,
  is_featured, programme_label, session_number, learning_outcomes, timezone,
  reminder_minutes
)
values
('afl-2026-cohort-onboarding', 'Africa Future Leaders 2026: Cohort Onboarding', 'Start together. Lead together.', 'A warm, practical welcome to the three-week programme.', 'Meet the cohort, understand the rhythm of the programme, and set a personal leadership intention for October.', 'Virtual · Africa Future Leaders', true, '2026-10-10T16:00:00+01:00', '2026-10-10T17:00:00+01:00', 'View onboarding', '/programme/afl-october-2026/onboarding.png', 'published', 'awardee_only', true, 'Africa Future Leaders October 2026', 0, '["Meet the cohort and programme rhythm", "Set a personal leadership intention"]'::jsonb, 'Africa/Lagos', 1440),
('global-talent-playbook', 'The Global Talent Playbook: How to Become Competitive Beyond Africa', null, 'Build a stronger signal, network, and point of view for a world that rewards range.', null, 'Virtual · Africa Future Leaders', true, '2026-10-11T16:00:00+01:00', '2026-10-11T17:00:00+01:00', 'View session', '/programme/afl-october-2026/global-talent-playbook.png', 'published', 'awardee_only', true, 'Africa Future Leaders October 2026', 1, '["Read the global talent landscape", "Choose a sharper competitive signal"]'::jsonb, 'Africa/Lagos', 1440),
('beyond-the-paycheck', 'Beyond the Paycheck: Building Career Capital and Financial Power', null, 'Turn your work into durable options, leverage, and financial power.', null, 'Virtual · Africa Future Leaders', true, '2026-10-13T18:00:00+01:00', '2026-10-13T19:00:00+01:00', 'View session', '/programme/afl-october-2026/beyond-the-paycheck.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 2, '["Map the assets your career is building", "Make one practical financial power move"]'::jsonb, 'Africa/Lagos', 1440),
('from-expertise-to-authority', 'From Expertise to Authority: Becoming a Voice People Listen To', null, 'Make your expertise legible, memorable, and useful to the people you want to move.', null, 'Virtual · Africa Future Leaders', true, '2026-10-15T18:00:00+01:00', '2026-10-15T19:00:00+01:00', 'View session', '/programme/afl-october-2026/from-expertise-to-authority.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 3, '["Clarify your point of view", "Build a repeatable authority habit"]'::jsonb, 'Africa/Lagos', 1440),
('leadership-multiplier', 'The Leadership Multiplier: How to Build People, Teams and Movements', null, 'Leadership compounds when the people around you grow more capable.', null, 'Virtual · Africa Future Leaders', true, '2026-10-17T16:00:00+01:00', '2026-10-17T17:00:00+01:00', 'View session', '/programme/afl-october-2026/leadership-multiplier.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 4, '["Spot the leverage points in a team", "Design a culture that multiplies ownership"]'::jsonb, 'Africa/Lagos', 1440),
('africas-hard-problems', 'Africa''s Hard Problems: Turning Complexity Into Opportunity', null, 'Stay useful in complexity by learning to frame hard problems as opportunity.', null, 'Virtual · Africa Future Leaders', true, '2026-10-20T18:00:00+01:00', '2026-10-20T19:00:00+01:00', 'View session', '/programme/afl-october-2026/africas-hard-problems.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 5, '["Frame a complex problem clearly", "Find an actionable entry point"]'::jsonb, 'Africa/Lagos', 1440),
('ai-native-leadership', 'AI-Native Leadership: Leading in a World Built Around AI', null, 'Lead with judgment, curiosity, and humanity as intelligent tools reshape work.', null, 'Virtual · Africa Future Leaders', true, '2026-10-22T18:00:00+01:00', '2026-10-22T19:00:00+01:00', 'View session', '/programme/afl-october-2026/ai-native-leadership.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 6, '["Separate signal from AI noise", "Choose a responsible leadership experiment"]'::jsonb, 'Africa/Lagos', 1440),
('from-knowledge-to-ideas', 'From Knowledge to Ideas: How to Produce Thinking That Matters', null, 'Move from consuming ideas to producing thinking that changes a conversation.', null, 'Virtual · Africa Future Leaders', true, '2026-10-24T16:00:00+01:00', '2026-10-24T17:00:00+01:00', 'View session', '/programme/afl-october-2026/from-knowledge-to-ideas.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 7, '["Build a useful thinking practice", "Turn an observation into a clear idea"]'::jsonb, 'Africa/Lagos', 1440),
('collaboration-advantage', 'The Collaboration Advantage: Building Across Borders, Sectors and Industries', null, 'Create the trust and shared language that makes ambitious collaboration possible.', null, 'Virtual · Africa Future Leaders', true, '2026-10-27T18:00:00+01:00', '2026-10-27T19:00:00+01:00', 'View session', '/programme/afl-october-2026/collaboration-advantage.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 8, '["Find the right collaborators", "Build a stronger shared brief"]'::jsonb, 'Africa/Lagos', 1440),
('beyond-the-initiative', 'Beyond the Initiative: Building Solutions That Actually Scale', null, 'Design the operating conditions that let a good idea survive and scale.', null, 'Virtual · Africa Future Leaders', true, '2026-10-29T18:00:00+01:00', '2026-10-29T19:00:00+01:00', 'View session', '/programme/afl-october-2026/beyond-the-initiative.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 9, '["Name the constraints to scale", "Design for adoption and continuity"]'::jsonb, 'Africa/Lagos', 1440),
('the-10-year-question', 'The 10-Year Question: What Will Your Leadership Have Changed?', null, 'Close the programme by turning insight into a decade-long leadership question.', null, 'Virtual · Africa Future Leaders', true, '2026-10-31T16:00:00+01:00', '2026-10-31T17:00:00+01:00', 'View session', '/programme/afl-october-2026/the-10-year-question.png', 'published', 'public', true, 'Africa Future Leaders October 2026', 10, '["Name the change you want to be accountable for", "Translate ambition into a next-year commitment"]'::jsonb, 'Africa/Lagos', 1440)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  summary = excluded.summary,
  description = excluded.description,
  location = excluded.location,
  is_virtual = excluded.is_virtual,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  registration_label = excluded.registration_label,
  featured_image_url = excluded.featured_image_url,
  programme_label = excluded.programme_label,
  session_number = excluded.session_number,
  learning_outcomes = excluded.learning_outcomes,
  timezone = excluded.timezone,
  reminder_minutes = excluded.reminder_minutes,
  status = excluded.status,
  visibility = excluded.visibility,
  is_featured = excluded.is_featured;

update public.events
set visibility = 'awardee_only'
where programme_label = 'Africa Future Leaders October 2026';
