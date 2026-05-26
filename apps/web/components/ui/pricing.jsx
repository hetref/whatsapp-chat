'use client'; // This component requires client-side state for the slider

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assumes shadcn's 'cn' utility
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

/**
 * @typedef {{ label: string; included?: boolean } | string} PricingFeature
 * @typedef {Object} InteractivePricingCardProps
 * @property {string} planName
 * @property {string} planDescription
 * @property {number} [fixedPrice]
 * @property {number} [pricePerUnit]
 * @property {string} [unitName]
 * @property {number} [minUnits]
 * @property {number} [maxUnits]
 * @property {number} [initialUnits]
 * @property {number} [step]
 * @property {string | null} [secondaryUnitName]
 * @property {number} [secondaryMinUnits]
 * @property {number} [secondaryMaxUnits]
 * @property {number} [secondaryInitialUnits]
 * @property {number} [secondaryPricePerUnit]
 * @property {number} [secondaryStep]
 * @property {string} [secondaryLabel]
 * @property {PricingFeature[]} [features]
 * @property {string} ctaText
 * @property {() => void} [onCtaClick]
 * @property {boolean} [ctaDisabled]
 * @property {string} [currency]
 * @property {string} [className]
 * @property {boolean} [highlighted]
 * @property {boolean} [showSlider]
 * @property {boolean} [fullWidth]
 */

/**
 * @param {InteractivePricingCardProps} props
 */
export function InteractivePricingCard(props) {
  const {
    planName,
    planDescription,
    fixedPrice = 0,
    pricePerUnit = 0,
    unitName = 'unit',
    minUnits = 1,
    maxUnits = 1,
    initialUnits = 1,
    step = 1,
    secondaryUnitName = null,
    secondaryMinUnits = 0,
    secondaryMaxUnits = 0,
    secondaryInitialUnits = 0,
    secondaryPricePerUnit = 0,
    secondaryStep = 1,
    secondaryLabel,
    features = [],
    ctaText,
    onCtaClick,
    ctaDisabled = false,
    currency = '₹',
    className,
    highlighted = false,
    showSlider = true,
    fullWidth = false,
  } = props;
  // State to manage the number of units selected by the user
  const [units, setUnits] = React.useState(initialUnits);
  const [secondaryUnits, setSecondaryUnits] = React.useState(
    secondaryInitialUnits ?? secondaryMinUnits ?? 0
  );

  // Calculate the total price based on the current number of units
  const totalPrice = React.useMemo(() => {
    if (!showSlider) {
      return Number(fixedPrice ?? 0).toFixed(2);
    }

    const primaryTotal = Number(units || 0) * Number(pricePerUnit || 0);
    const secondaryTotal = secondaryUnitName
      ? Number(secondaryUnits || 0) * Number(secondaryPricePerUnit || 0)
      : 0;

    return Number(primaryTotal + secondaryTotal).toFixed(2);
  }, [
    fixedPrice,
    pricePerUnit,
    secondaryPricePerUnit,
    secondaryUnitName,
    secondaryUnits,
    showSlider,
    units,
  ]);

  const cardWidthClassName = fullWidth ? 'w-full' : 'w-full max-w-sm';

  return (
    <Card
      className={cn(
        `flex ${cardWidthClassName} flex-col border-border bg-card text-card-foreground shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]`,
        highlighted ? 'border-primary/60 shadow-[0_12px_50px_rgba(34,197,94,0.16)] dark:shadow-[0_12px_50px_rgba(34,197,94,0.24)]' : '',
        className
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{planName}</CardTitle>
          {highlighted && <Badge variant="default">Popular</Badge>}
        </div>
        <CardDescription className="text-muted-foreground">{planDescription}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6 text-center">
          <span className="text-5xl font-bold text-foreground">
            {currency}
            {totalPrice}
          </span>
          <span className="text-muted-foreground">/month</span>
        </div>

        <div className="space-y-4">
          {showSlider && (
            <>
              {/* Interactive Slider */}
              <div className="space-y-2">
                <div className="flex justify-between gap-4 text-sm font-medium text-foreground">
                  <span>{`${units} ${unitName}${units > 1 ? 's' : ''}`}</span>
                  <span className="text-right text-muted-foreground">
                    {currency}
                    {pricePerUnit}/{unitName}
                  </span>
                </div>
                <Slider
                  value={[units]}
                  onValueChange={(value) => setUnits(value[0])}
                  min={minUnits}
                  max={maxUnits}
                  step={step}
                  className="w-full min-w-0"
                  aria-label={`Select number of ${unitName}s`}
                />
              </div>

              {secondaryUnitName && (
                (() => {
                  const secondaryUnitLabel = secondaryUnitName.toLowerCase().includes('storage')
                    ? secondaryUnitName
                    : `${secondaryUnitName}${secondaryUnits > 1 ? 's' : ''}`;

                  const secondarySummary = secondaryLabel
                    ? `${secondaryLabel}: ${secondaryUnits} ${secondaryUnitLabel}`
                    : `${secondaryUnits} ${secondaryUnitLabel}`;

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between gap-4 text-sm font-medium text-foreground">
                        <span>{secondarySummary}</span>
                        <span className="text-right text-muted-foreground">
                          {currency}
                          {secondaryPricePerUnit}/{secondaryUnitName}
                        </span>
                      </div>
                      <Slider
                        value={[secondaryUnits]}
                        onValueChange={(value) => setSecondaryUnits(value[0])}
                        min={secondaryMinUnits}
                        max={secondaryMaxUnits}
                        step={secondaryStep}
                        className="w-full min-w-0"
                        aria-label={`Select number of ${secondaryUnitName}s`}
                      />
                    </div>
                  );
                })()
              )}
            </>
          )}

          {/* Features List */}
          <ul className="space-y-3 text-sm text-foreground">
            {features.map((feature, index) => {
              const featureLabel = typeof feature === 'string' ? feature : feature.label;
              const featureIncluded = typeof feature === 'string' ? true : feature.included !== false;

              return (
                <li key={index} className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${featureIncluded ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={featureIncluded ? '' : 'text-muted-foreground'}>{featureLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className={cn(
            "w-full",
            highlighted
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border-border bg-background text-foreground hover:bg-muted hover:text-foreground",
          )}
          size="lg"
          variant={highlighted ? 'default' : 'outline'}
          onClick={onCtaClick}
          disabled={ctaDisabled}
        >
          {ctaText}
        </Button>
      </CardFooter>
    </Card>
  );
}