import { Project100Impact } from "../../../../../_components/project100/impact-client";
export default async function ImpactSupportPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <Project100Impact screen="support" groupId={groupId} />;
}
