"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const ThemeSwitcher = ({ className }: { className?: string }) => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8 rounded-xl" />;
  }

  const ICON_SIZE = 15;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors cursor-pointer",
            className
          )}
          title="Switch theme"
          aria-label="Switch theme"
        >
          {theme === "light" ? (
            <Sun key="light" size={ICON_SIZE} className="text-amber-600" />
          ) : theme === "dark" ? (
            <Moon key="dark" size={ICON_SIZE} className="text-emerald-300" />
          ) : (
            <Laptop key="system" size={ICON_SIZE} className="text-stone-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-36 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg p-1 text-xs"
        align="end"
      >
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={setTheme}
        >
          <DropdownMenuRadioItem className="flex items-center gap-2 rounded-lg cursor-pointer text-xs" value="light">
            <Sun size={ICON_SIZE} className="text-amber-600" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex items-center gap-2 rounded-lg cursor-pointer text-xs" value="dark">
            <Moon size={ICON_SIZE} className="text-emerald-400" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex items-center gap-2 rounded-lg cursor-pointer text-xs" value="system">
            <Laptop size={ICON_SIZE} className="text-stone-400" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeSwitcher };
