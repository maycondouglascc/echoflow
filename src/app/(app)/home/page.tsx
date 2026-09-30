import { AccountControl } from "@/components/AccountControl";
import { PlaylistBrowser } from "@/components/PlaylistBrowser";
import { getPlaylists } from "@/lib/catalog";
export default async function HomePage() {
  const playlists = await getPlaylists();
  return (
    <main className="logged-page">
      <PlaylistBrowser playlists={playlists} account={<AccountControl />} />
    </main>
  );
}
