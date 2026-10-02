"use client";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import type { PlaylistSummary } from "@/lib/catalog";

export function PlaylistBrowser({
  playlists,
  account,
}: {
  playlists: PlaylistSummary[];
  account: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState("all");
  const visible = playlists.filter(
    (p) =>
      p.title.toLowerCase().includes(search.trim().toLowerCase()) &&
      (filter === "all" || (filter === "completed" ? p.completed : !p.completed)),
  );
  return (
    <div className="platform-grid">
      <aside className="platform-sidebar">
        <h1>Available playlists</h1>
        <div className="catalog-tools">
          <label className="search-field">
            <Image src="/design/search.svg" width={24} height={24} alt="" />
            <input
              type="search"
              aria-label="Search playlists"
              placeholder="Search playlists"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="filter-button"
            aria-label="Filter playlists"
            aria-expanded={showFilter}
            onClick={() => setShowFilter(!showFilter)}
          >
            <Image src="/design/filter.svg" width={24} height={24} alt="" />
          </button>
        </div>
        {showFilter ? (
          <label className="completion-filter">
            Completion filter
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All playlists</option>
              <option value="completed">Completed</option>
              <option value="pending">Not completed</option>
            </select>
          </label>
        ) : null}
        <ul className="playlist-list">
          {visible.map((p) => (
            <li key={p.id}>
              <Link href={`/scenarios/${p.slug}`}>
                <span>{p.title}</span>
                {p.completed ? (
                  <span className="completion-badge">
                    <Image src="/design/check.svg" width={24} height={24} alt="" />
                    Completed
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        {!visible.length ? (
          <div className="no-results">
            <p role="status">No playlists found</p>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear search
            </button>
          </div>
        ) : null}
        {account}
      </aside>
      <section className="platform-panel empty-panel" aria-label="Playlist selection">
        <div className="empty-art">
          <Image src="/design/shadow.svg" className="empty-shadow" width={199} height={34} alt="" />
          <Image
            src="/design/kitten.png"
            width={384}
            height={256}
            alt="A playful orange kitten"
            priority
          />
        </div>
        <p>No playlist selected</p>
      </section>
    </div>
  );
}
