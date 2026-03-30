"use client";

import { RiGithubFill, RiLogoutBoxLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

export function SignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignIn() {
    setPending(true);
    setError(null);

    const result = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/app",
    });

    if (result.error) {
      setPending(false);
      setError(result.error.message ?? "Could not start GitHub sign-in.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="lg" onClick={onSignIn} disabled={pending}>
        <RiGithubFill data-icon="inline-start" aria-hidden />
        {pending ? "Redirecting…" : "Continue with GitHub"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onSignOut}
      disabled={pending}
    >
      <RiLogoutBoxLine data-icon="inline-start" aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
