import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: {
    default: "EchoFlow",
    template: "%s | EchoFlow",
  },
  description: "Practice English speaking through listening and repetition.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div id="main-content">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
