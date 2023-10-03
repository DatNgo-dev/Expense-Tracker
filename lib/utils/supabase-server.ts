import "server-only";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types/database.types";

export const createClient = () => {
  return createServerComponentClient<Database>({
    cookies,
  });
};
