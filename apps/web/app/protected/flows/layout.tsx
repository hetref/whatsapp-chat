import WhatsAppSetupGate from "@/components/whatsapp-setup-gate";

export default function FlowsLayout({ children }: { children: React.ReactNode }) {
  return <WhatsAppSetupGate>{children}</WhatsAppSetupGate>;
}
