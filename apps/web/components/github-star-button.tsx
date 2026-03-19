"use client";

import { Star } from "lucide-react";
import Link from "next/link";

export function GitHubStarButton() {
  return (
    <Link
      href="https://github.com/hetref/whatsapp-chat"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium text-sm"
    >
      <Star className="h-4 w-4" />
      <span>Star on GitHub</span>
    </Link>
  );
}

