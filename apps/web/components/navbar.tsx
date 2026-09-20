"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import LogoIcon from "@/components/logo-icon";
import { Menu, X, Github } from "lucide-react";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/open-source" },
];

export function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/60 dark:border-emerald-950/40 bg-[#FAF8F5]/85 dark:bg-[#0B120E]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FAF8F5]/70 dark:supports-[backdrop-filter]:bg-[#0B120E]/70 transition-colors">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg text-stone-900 dark:text-stone-100">
          <LogoIcon className="h-7 w-7 text-[#5F7C65] dark:text-[#7EA285]" />
          <span>WaChat</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white transition-colors rounded-md"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hetref/whatsapp-chat"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white transition-colors rounded-md inline-flex items-center gap-1.5"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeSwitcher />
          {isLoaded && isSignedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/protected">
                <Button size="sm" className="bg-[#5F7C65] hover:bg-[#526D57] text-white">Dashboard</Button>
              </Link>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className="text-stone-700 dark:text-stone-300">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" className="bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-xs">Get Started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <button
            className="p-2 rounded-md hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/hetref/whatsapp-chat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <div className="pt-3 border-t mt-2 space-y-2">
            {isLoaded && isSignedIn ? (
              <Link href="/protected" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/sign-in"
                  className="flex-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link
                  href="/sign-up"
                  className="flex-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
