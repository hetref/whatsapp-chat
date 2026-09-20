import Link from "next/link";
import Image from "next/image";
import LogoIcon from "@/components/logo-icon";
import { Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200/80 bg-[#F4F1EB] text-stone-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 font-semibold text-lg mb-3 text-stone-900">
              <LogoIcon className="h-6 w-6 text-[#5F7C65]" />
              <span>WaChat</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Enterprise-grade WhatsApp Business platform for managing Meta
              Cloud API at scale.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Built by <b>DevAlly</b></span>
              {/* <Image
                src="/devally-logo-large.png"
                alt="DevAlly"
                width={120}
                height={36}
                className="h-10 w-auto dark:invert opacity-80"
              /> */}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/#features"
                  className="hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/protected"
                  className="hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/open-source"
                  className="hover:text-foreground transition-colors"
                >
                  Self-Hosting Guide
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/hetref/whatsapp-chat#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/hetref/whatsapp-chat/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/hetref/whatsapp-chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/hetref/whatsapp-chat/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Discussions
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/hetref/whatsapp-chat/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Issues
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-xs text-muted-foreground">
          <p>&copy; {year} WaChat by DevAlly. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
            <a
              href="https://github.com/hetref/whatsapp-chat"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              Open Source on GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
