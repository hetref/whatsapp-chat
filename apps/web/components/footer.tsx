import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <MessageCircle className="h-6 w-6 text-primary" />
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
          <div className="flex items-center gap-6">
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
