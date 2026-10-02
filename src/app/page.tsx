import Image from "next/image";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";

export default function Home() {
  return (
    <main className="landing">
      <div className="beta-banner">Free during beta - $0</div>
      <header className="landing-header">
        <Link href="/" aria-label="EchoFlow home">
          <Image src="/design/logo.svg" width={157} height={32} alt="EchoFlow" priority />
        </Link>
        <nav aria-label="Account">
          <AuthModal label="Sign up" className="signup-button" />
          <AuthModal label="Login" className="login-button" initialMode="login" />
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            English
            <br />
            shadowing
            <br />
            made <span>easy</span>
          </h1>
          <p>Find your rhythm in English with daily shadowing exercises</p>
          <AuthModal label="Practice now" className="dark-button practice-cta" />
        </div>
        <div className="how-panel">
          <Image
            className="hero-playback"
            src="/design/playback.png"
            width={180}
            height={180}
            alt=""
            priority
          />
          <h2>How it works</h2>
          <ol>
            {["Listen to a phrase", "Record yourself repeating it", "Compare and improve"].map(
              (step, i) => (
                <li key={step}>
                  <span>{i + 1}</span>
                  {step}
                </li>
              ),
            )}
          </ol>
          <Image className="hero-star" src="/design/star.png" width={120} height={120} alt="" />
          <Image className="hero-shadow" src="/design/shadow.svg" width={199} height={34} alt="" />
          <Image
            className="hero-kitten"
            src="/design/kitten.png"
            width={384}
            height={256}
            alt="A playful orange kitten"
            priority
          />
        </div>
      </section>
      <footer className="landing-footer">
        <Link href="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}
