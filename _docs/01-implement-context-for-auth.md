# Implement Context for Authentication using Supabase

In the Supabase Next.js documentation, we are required to retrieve the session by calling createClientComponent or createServerComponent whenever a user wants to perform an action, and that user's authentication needs to be checked. Instead, we will create a context provider so that we only call the function once.

## Create the Providers

In this project, we will create two types of providers called SupabaseProvider.tsx and SupabaseAuthProvider.tsx. SupabaseProvider.tsx defines a context provider (SupabaseProvider) for the Supabase client instance, allowing child components to access and use Supabase functionality via the useSupabase hook. This is a common pattern for managing shared state or services like Supabase clients in a React application. The SupabaseAuthProvider component is a crucial part of the application's authentication and data management. It serves as a context provider in a React application, allowing child components access to the Supabase client and related functionality. It takes two props: serverSession, which represents the user's session, and children, which are the components that will access this context. Inside the component, it retrieves the Supabase client instance via the useSupabase hook, facilitating communication with the Supabase database. It defines a function to fetch user data based on the provided serverSession and employs the useSWR hook to manage data fetching and associated loading and error states. The component also offers essential authentication functions, such as signing out, signing in with GitHub OAuth, and signing in with email and password. Furthermore, it ensures synchronization between the server and client by utilizing a useEffect to refresh the page whenever the user's authentication state changes.

1. Create a component folder in the root directory
2. Create a provider folder in the component directory
3. Create two files called `SupabaseProvider.tsx` and `SupabaseAuthProvider.tsx`
4. In `SupabaseProvider.tsx`, add the following:

```JavaScript
"use client";

import { createClient } from "@/lib/utility/supabase-client";
import { createContext, useContext, useState } from "react";

import type { Database } from "@/lib/types/database.types";
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs";

type SupabaseContext = {
  supabase: SupabaseClient<Database>;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => createClient());

  return (
    <Context.Provider value={{ supabase }}>
      <>{children}</>
    </Context.Provider>
  );
}

export const useSupabase = () => {
  let context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  } else {
    return context;
  }
};
```

5. In `SupabaseAuthProvider.tsx` add the following:

```JavaScript
"use client";

import { Profile } from "@/lib/types/profile";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import useSWR from "swr";
import { useSupabase } from "./supabase-provider";
interface ContextI {
  user: Profile | null | undefined;
  error: any;
  isLoading: boolean;
  mutate: any;
  signOut: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
}
const Context = createContext<ContextI>({
  user: null,
  error: null,
  isLoading: true,
  mutate: null,
  signOut: async () => {},
  signInWithGithub: async () => {},
  signInWithEmail: async (email: string, password: string) => null,
});

export default function SupabaseAuthProvider({
  serverSession,
  children,
}: {
  serverSession?: Session | null;
  children: React.ReactNode;
}) {
  const { supabase } = useSupabase();
  const router = useRouter();

  // Get USER
  const getUser = async () => {
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", serverSession?.user?.id as string)
      .single();
    if (error) {
      console.log(error);
      return null;
    } else {
      return user;
    }
  };

  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(serverSession ? "profile-context" : null, getUser);

  // Sign Out
  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Sign-In with Github
  const signInWithGithub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "http://localhost:3000/api/callback",
      },
    });
  };

  // Sign-In with Email
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return error.message;
    }

    return null;
  };

  // Refresh the Page to Sync Server and Client
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== serverSession?.access_token) {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, serverSession?.access_token]);

  const exposed: ContextI = {
    user,
    error,
    isLoading,
    mutate,
    signOut,
    signInWithGithub,
    signInWithEmail,
  };

  return <Context.Provider value={exposed}>{children}</Context.Provider>;
}

export const useAuth = () => {
  let context = useContext(Context);
  if (context === undefined) {
    throw new Error("useAuth must be used inside SupabaseAuthProvider");
  } else {
    return context;
  }
};

```

There will be some import errors and this is okay, we will be fixing these now.

## Create database types from Supabase

To create types for our database we will need to use Supabase CLI. The Supabase CLI is a single binary Go application that provides everything you need to setup a local development environment.

You can install the CLI via npm or other supported package managers. The minimum required version of the CLI is v1.8.1.

1. `npm i supabase@">=1.8.1" --save-dev`

Login with your Personal Access Token:

2. `npx supabase login` You will be prompted to enter your PAT. Get it from the setting area in your supabase dashboard

Generate types for your project to produce the types/supabase.ts file:

3. `npx supabase gen types typescript --project-id $PROJECT_REF > ./path/to/folder/name_of_file.ts` In our example we will create a file called database.types.ts

4. We can also create a script command to update our database types. `"update-types": "npx supabase gen types typescript --project-id $PROJECT_REF > ./lib/types/database.types.ts"`

5. run this command `npm run update-types` in your terminal.

Doing this step will remove most of the import errors. Now we will have to get the type from our user table.

#### User (Profile) Table type

Import the following code into a new file called `profile.ts` in the '@/lib/types' directory or your choice of path.

```JavaScript
import { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profile"]["Row"];
```

There will be an error saying that a user is currently not in our database. To fix this we will create a user or profile table in Supabase dashboard. You can also do this if an orm is installed. Check `02-installing-an-ORM.md`

Currently we have auth.user table that supabase provides for implementing authentication however we will need to create a `public.profile` table to store user data (username, first and last name, address etc...)

Go to your supabase dashboard and under sql editor add a `New query`. In the `New query` screen paste in this code:

```SQL
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  first_name text,
  last_name text,
--   Add more columns here

  primary key (id)
);

alter table public.profiles enable row level security;
```

Run the command.

Run `npm run update-types` in your terminal and this should fix all the errors.

## Create supabase-client and supabase-server

TODO: Add a description to what these code do for our project.

1. supabase-client code:

```JavaScript
import { Database } from "@/lib/types/database.types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const createClient = () => createClientComponentClient<Database>();
```

2. supabase-server code:

```JavaScript
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import "server-only";

import type { Database } from "@/lib/types/database.types";

export const createClient = () => {
  return createServerComponentClient<Database>({
    cookies,
  });
};
```

After implementing all of these components, we can now utilise them in our project.

First we will head to our root layout file in our app directory (layout.tsx)

Copy the code below and paste in the layout.tsx file.

```JavaScript
import "server-only";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import SupabaseAuthProvider from "@/components/provider/SupabaseAuthProvider";
import SupabaseProvider from "@/components/provider/SupabaseProvider";
import { createClient } from "@/lib/utils/supabase-server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return (
    <html lang="en">
      <SupabaseProvider>
        <SupabaseAuthProvider serverSession={session}>
          <body className={inter.className}>
            <main className="min-h-screen bg-background flex flex-col items-center">
              {children}
            </main>
          </body>
        </SupabaseAuthProvider>
      </SupabaseProvider>
    </html>
  );
}
```

To allow supabase auth to create profile for the newly authenticated user we can use the SQL editor in supabase. Create a new query and write in this `User Management Starter` or you can find this code in the SQL editor template section called `User Management Starter`.

```SQL
-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);
-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles
  enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set up Storage!
insert into storage.buckets (id, name)
  values ('avatars', 'avatars');

-- Set up access controls for storage.
-- See https://supabase.com/docs/guides/storage#policy-examples for more details.
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');
```

## Conclusion

So at this point you can start making your app using supabase auth.
