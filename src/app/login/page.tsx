import {
  RiGithubFill,
  RiImageCircleLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import { redirect } from "next/navigation";
import { SignInButton } from "~/components/auth-controls";
import { BrandLogo } from "~/components/brand-logo";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getSession } from "~/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <section className="grid gap-8 border border-border bg-card p-8 md:grid-cols-[1.25fr_0.75fr] md:items-center">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <BrandLogo variant="wordmark" size="lg" />
              <Badge variant="secondary" className="w-fit">
                Multi-User v1
              </Badge>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                Keep every Notion integration in its own lane.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Sign in with GitHub, save multiple Notion internal integrations,
                and choose the right account at export time. Secrets stay
                encrypted in the database and never leave the server.
              </p>
            </div>
            <SignInButton />
          </div>

          <Card className="bg-background">
            <CardHeader>
              <CardTitle>What changed</CardTitle>
              <CardDescription>
                The exporter is no longer tied to a single shared env secret.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex gap-3">
                <RiGithubFill
                  className="mt-0.5 size-5 text-foreground"
                  aria-hidden
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  GitHub auth with Better Auth and database-backed sessions.
                </p>
              </div>
              <div className="flex gap-3">
                <RiShieldKeyholeLine
                  className="mt-0.5 size-5 text-foreground"
                  aria-hidden
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Saved Notion integration secrets, encrypted at rest with a
                  separate key.
                </p>
              </div>
              <div className="flex gap-3">
                <RiImageCircleLine
                  className="mt-0.5 size-5 text-foreground"
                  aria-hidden
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Per-export account switching without editing local environment
                  variables.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
