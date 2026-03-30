import { DashboardClient } from "~/components/dashboard-client";
import { listUserIntegrations } from "~/lib/notion-integrations";
import { requireSession } from "~/lib/session";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const session = await requireSession();
  const integrations = await listUserIntegrations(session.user.id);

  return (
    <DashboardClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      integrations={integrations}
    />
  );
}
