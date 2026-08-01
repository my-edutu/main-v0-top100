// Programmes people can join a waiting list for. None of them are open for
// registration yet — the waiting list is the only entry point until they are.
export const WAITLIST_PROGRAMS = [
    {
        slug: "summit-2026",
        label: "Africa Future Leaders Summit 2026",
        detail: "In-person in Lagos, Nigeria. Dates to be announced.",
    },
    {
        slug: "talk100-live",
        label: "Talk100 Live: Innovation in African Tech",
        detail: "Virtual conversation series. Next session to be announced.",
    },
    {
        slug: "project100-info-session",
        label: "Project100 Scholarship Info Session",
        detail: "Virtual session on eligibility and the application process.",
    },
    {
        slug: "general",
        label: "Any Top100 programme",
        detail: "Tell us you're interested and we'll notify you about everything.",
    },
] as const;

export type WaitlistProgramSlug = (typeof WAITLIST_PROGRAMS)[number]["slug"];

export const WAITLIST_PROGRAM_SLUGS = WAITLIST_PROGRAMS.map((program) => program.slug) as [
    WaitlistProgramSlug,
    ...WaitlistProgramSlug[],
];

export const isWaitlistProgramSlug = (value: unknown): value is WaitlistProgramSlug =>
    typeof value === "string" && WAITLIST_PROGRAM_SLUGS.includes(value as WaitlistProgramSlug);

export const waitlistProgramLabel = (slug: WaitlistProgramSlug): string =>
    WAITLIST_PROGRAMS.find((program) => program.slug === slug)?.label ?? slug;
