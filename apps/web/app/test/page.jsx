import { InteractivePricingCard } from '@/components/ui/pricing'; // Adjust path as needed

export default function InteractivePricingCardDemo() {
  const proPlanFeatures = [
    'Unlimited Projects',
    'Team Collaboration',
    'Priority Support',
    'Advanced Analytics',
    '10GB Storage',
  ];

  const basicPlanFeatures = [
    '5 Projects',
    'Basic Collaboration',
    'Email Support',
    'Basic Analytics',
    '2GB Storage',
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] w-full flex-col items-center justify-center gap-8 bg-transparent p-4 md:flex-row">
      {/* Standard Plan */}
      <InteractivePricingCard
        planName="Basic"
        planDescription="For individuals and small teams starting out."
        pricePerUnit={10}
        unitName="user"
        minUnits={1}
        maxUnits={10}
        initialUnits={3}
        features={basicPlanFeatures}
        ctaText="Get Started with Basic"
      />

      {/* Highlighted Plan */}
      <InteractivePricingCard
        planName="Pro"
        planDescription="For growing teams that need collaboration and power."
        pricePerUnit={15}
        unitName="user"
        minUnits={5}
        maxUnits={25}
        initialUnits={10}
        features={proPlanFeatures}
        ctaText="Subscribe to Pro"
        highlighted={true} // This prop makes the card stand out
      />
    </div>
  );
}