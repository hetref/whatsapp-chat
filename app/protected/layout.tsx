import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication before rendering the layout
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Get user ID from claims
  const userId = data.claims.sub;

  // Check if user has completed setup
  const { data: settings } = await supabase
    .from('user_settings')
    .select('access_token_added, webhook_verified')
    .eq('id', userId)
    .single();

  // Determine if setup is complete
  const isSetupComplete = settings?.access_token_added || settings?.webhook_verified;

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Navigation Bar */}
      <nav className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/protected" className="text-xl font-bold text-primary">
            WhatsApp Chat
          </Link>
          <Link 
            href="/protected/setup" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Setup
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {isSetupComplete ? (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
              ✓ Connected
            </span>
          ) : (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
              ⚠ Setup Required
            </span>
          )}
        </div>
      </nav>
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
