const guidance: Record<string, string> = {
  awardees: 'Search and filter before editing. Featured profiles appear on the homepage; hidden profiles are private. Review your selection before using bulk actions.',
  users: 'Check the account and its current role before changing access. Permissions affect what a person can see and manage.',
  invites: 'Use invitations to help awardees claim their profiles. Check the recipient and cohort before sharing a claim code.',
  awards: 'Prioritise verified paid orders with delivery exceptions. Review addresses and shipping quotes before dispatching.',
  events: 'Review the date, location and audience before publishing or pushing invitations. Sending an invitation contacts members.',
  blog: 'Save your work as a draft while preparing it. Check the preview and publishing status before making a story public.',
  messages: 'Review the sender and request before responding. Cash pledges express intent; they are not confirmed payments.',
  notifications: 'Check the audience and message carefully before sending. A broadcast can reach many members at once.',
  announcements: 'Keep announcements short and action-focused. Confirm visibility and dates before publishing.',
  'feature-requests': 'Read the full submission before updating its status. Keep editorial decisions separate from publishing.',
  'member-hub': 'Use the relevant queue to review member activity and submissions. Check the audience before sending communications.',
  'member-posts': 'Review the full post and author before changing its visibility.',
  'member-conversations': 'Open a conversation to review its context. Keep member information within authorised staff workflows.',
  opportunities: 'Check deadlines, eligibility and destination links before publishing an opportunity.',
  interviews: 'Check availability and contact details before coordinating an interview.',
  youtube: 'Check the video link and title before adding a story to the channel.',
  homepage: 'Preview your changes and check destination links before updating the public homepage.',
  analytics: 'Check each metric’s scope and date range before comparing results. Missing data is not zero activity.',
  settings: 'Review changes before saving. Integration and security settings can affect the entire platform.',
}

export default function AdminSectionHelp({ pathname }: { pathname: string }) {
  const section = pathname.split('/')[2]
  const hint = guidance[section]
  if (!hint) return null
  return <details className="admin-section-help"><summary>Working in this section <span>Quick guide</span></summary><p>{hint}</p></details>
}
