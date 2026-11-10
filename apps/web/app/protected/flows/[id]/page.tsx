import FlowBuilder from "@/components/flows/flow-builder";

interface FlowEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlowEditorPage({ params }: FlowEditorPageProps) {
  const { id } = await params;
  return <FlowBuilder flowId={id} />;
}
