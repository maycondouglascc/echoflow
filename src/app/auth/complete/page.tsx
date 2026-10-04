import { AuthLinkCompletion } from "@/components/AuthLinkCompletion";

// Link credentials are transient; this page must never be served from a CDN cache.
export const dynamic = "force-dynamic";

export default function CompleteEmailLink() {
  return <AuthLinkCompletion />;
}
