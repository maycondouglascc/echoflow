import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy & microphone" };

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <Link href="/" aria-label="EchoFlow home">
          <Image src="/design/logo.svg" width={157} height={32} alt="EchoFlow" />
        </Link>
        <Link href="/home">Back to playlists</Link>
      </header>
      <article className="privacy-content">
        <h1>Privacy &amp; microphone</h1>
        <p className="privacy-intro">
          Your voice is for practice. Here’s how this beta handles your information.
        </p>
        <section aria-labelledby="voice-privacy">
          <h2 id="voice-privacy">Your microphone and recordings</h2>
          <p>
            Microphone permission lets you record when you choose Speak and compare your voice with
            the reference. Granting permission does not start a recording.
          </p>
          <p>
            Recordings stay in page memory, are never uploaded and disappear when you leave or
            reload the practice page. Your voice selection and unfinished practice progress are also
            temporary.
          </p>
          <p>
            The microphone is released after permission checking and after each take. You can
            decline access and still listen, or change microphone permission in your browser’s site
            settings.
          </p>
          <p>
            Automatic stop checks sound levels locally in your browser. It does not transcribe your
            voice or send it to a speech service.
          </p>
        </section>
        <section aria-labelledby="account-privacy">
          <h2 id="account-privacy">Your account and progress</h2>
          <p>
            Supabase manages sign-in and account information, including your email address. A
            confirmed account is required to access playlists, phrases and reference audio.
          </p>
          <p>
            When you complete a playlist, EchoFlow saves the playlist and completion time for your
            account. This does not include a recording, transcript or pronunciation score. Other
            accounts cannot access your completion records.
          </p>
        </section>
        <section aria-labelledby="session-privacy">
          <h2 id="session-privacy">Session and usage information</h2>
          <p>
            Session cookies keep you signed in. A marker in this tab’s session storage remembers
            that you have seen the microphone setup; it contains no audio.
          </p>
          <p>
            Daily usage counters track confirmed sign-ups, practice access events and new playlist
            completions. These counters contain no email address, user identifier, recording or
            transcript. Practice access events are not counts of unique people.
          </p>
        </section>
        <section aria-labelledby="beta-privacy">
          <h2 id="beta-privacy">About this beta</h2>
          <p>
            This page explains the current implementation. A complete privacy policy, including the
            responsible organisation, contact details and retention terms, still needs approval
            before public launch.
          </p>
        </section>
        <Link className="dark-button" href="/home">
          Back to playlists
        </Link>
      </article>
    </main>
  );
}
