import { Project100Impact } from "../../_components/project100/impact-client";

export default async function Project100ScholarshipPage({
  searchParams,
}: {
  searchParams: Promise<{ contribution?: string }>;
}) {
  const { contribution } = await searchParams;
  const contributionId =
    contribution && /^[a-f0-9-]{36}$/i.test(contribution)
      ? contribution
      : undefined;
  return <Project100Impact contributionId={contributionId} />;
}
