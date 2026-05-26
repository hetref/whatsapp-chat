"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef(
  (
    {
      className,
      showTooltip = false,
      tooltipContent,
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(() => {
      if (Array.isArray(defaultValue)) return Number(defaultValue[0] ?? min);
      if (Array.isArray(value)) return Number(value[0] ?? min);
      if (typeof defaultValue === 'number') return defaultValue;
      if (typeof value === 'number') return value;
      return Number(min);
    });

    React.useEffect(() => {
      if (Array.isArray(value)) {
        setInternalValue(Number(value[0] ?? min));
      } else if (typeof value === 'number') {
        setInternalValue(value);
      }
    }, [min, value]);

    const currentValue = Array.isArray(value)
      ? Number(value[0] ?? min)
      : Number(internalValue ?? min);

    const clampedMax = Number(max);
    const clampedMin = Number(min);
    const percent = clampedMax === clampedMin
      ? 0
      : Math.min(100, Math.max(0, ((currentValue - clampedMin) / (clampedMax - clampedMin)) * 100));

    const handleChange = (event) => {
      const nextValue = Number(event.target.value);
      setInternalValue(nextValue);
      onValueChange?.([nextValue]);
    };

    const tooltipText = showTooltip
      ? tooltipContent
        ? tooltipContent(currentValue)
        : currentValue
      : undefined;

    return (
      <div
        className={cn(
          "relative flex w-full min-w-0 items-center",
          className,
        )}
        title={tooltipText}
      >
        <div className="relative h-6 w-full min-w-0">
          <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-white dark:bg-zinc-600">
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${percent}%` }}
            />
          </div>

          <input
            {...props}
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            value={currentValue}
            onChange={handleChange}
            aria-disabled={disabled}
            className={cn(
              "absolute inset-0 z-10 h-6 w-full cursor-pointer appearance-none bg-transparent outline-none",
              "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-out",
              "[&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent",
              "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150 [&::-moz-range-thumb]:ease-out",
              "[&::-moz-focus-outer]:border-0",
              "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring/40",
              "focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-ring/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:[&::-webkit-slider-thumb]:border-zinc-200 dark:[&::-moz-range-thumb]:border-zinc-200",
            )}
          />
        </div>
      </div>
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
