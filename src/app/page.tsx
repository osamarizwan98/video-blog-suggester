import Image from "next/image";
import { headers } from "next/headers";
import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { SignInButton, SignOutButton } from "./auth-buttons";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-4 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <h1 className="text-2xl font-semibold tracking-tight">Video & Blog Search</h1>
      {/* Session is read per request, so it streams in behind a boundary (Cache Components). */}
      <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />}>
        <AuthStatus />
      </Suspense>
    </main>
  );
}

async function AuthStatus() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <SignInButton />;
  }

  const { name, image } = session.user;

  return (
    <div className="flex flex-col items-center gap-4">
      {image ? (
        <Image
          src={image}
          alt={`${name}'s avatar`}
          width={80}
          height={80}
          className="rounded-full"
        />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold dark:bg-zinc-800">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <p className="text-lg font-medium">{name}</p>
      <SignOutButton />
    </div>
  );
}
