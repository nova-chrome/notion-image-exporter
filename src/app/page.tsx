import { DashboardClient } from "~/components/dashboard-client";
import { requireSession } from "~/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession();

  return (
    <DashboardClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
