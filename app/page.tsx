import { Dashboard } from "@/components/Dashboard";

/**
 * The dashboard is one interactive surface driven by a shared filter set, so the
 * page is a thin server shell around a single client container. Data comes from
 * the Route Handlers under /api, which means everything the UI can do is also
 * reachable and testable with curl.
 */
export default function Page() {
  return <Dashboard />;
}
