import { redirect } from "next/navigation";
import { SignInButton } from "~/components/auth-controls";
import { BrandLogo } from "~/components/brand-logo";
import { getSession } from "~/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <section className="border border-border bg-card p-8">
          <div className="flex flex-col gap-5">
            <BrandLogo variant="wordmark" size="lg" />
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                Keep every Notion integration in its own lane.
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Sign in with GitHub, save multiple Notion internal integrations,
                and choose the right account at export time. Secrets stay
                encrypted in the database and never leave the server.
              </p>
            </div>
            <SignInButton />
          </div>
        </section>
      </main>
    </div>
  );
}
