import React from "react";

export default function LogoIcon({
  className = "size-8 text-[#5F7C65]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="8"
        width="6.5"
        height="16"
        rx="3.25"
        fill="currentColor"
        className="opacity-90"
      />
      <circle cx="10.5" cy="18.5" r="3.25" fill="currentColor" />
      <rect
        x="13.25"
        y="9.5"
        width="6.5"
        height="13"
        rx="3.25"
        fill="currentColor"
      />
      <circle cx="21.5" cy="18.5" r="3.25" fill="currentColor" />
      <rect
        x="23.5"
        y="8"
        width="6.5"
        height="16"
        rx="3.25"
        fill="currentColor"
        className="opacity-90"
      />
    </svg>
  );
}
