import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import { createClient } from "@/lib/utils/supabase-server";

export const dynamic = "force-dynamic";

export default async function Index() {
  const supabase = createClient();

  // prettier-ignore
  const {data: { session }} = await supabase.auth.getSession();

  const user = session?.user;

  return (
    <div className="w-full flex flex-col items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm text-foreground">
          <div />
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                Hey, {user.email}!
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
