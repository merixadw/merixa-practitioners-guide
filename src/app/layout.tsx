import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merixa Practitioner’s Guide",
  description:
    "Merixa Practitioner’s Guide — encyclopedia, paths, and tutor for finance, audit, risk, and control professionals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#102229" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`${dmSans.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("mpg-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);var l=localStorage.getItem("mpg-language");if(l&&l!=="en"){document.cookie="googtrans=/en/"+l+";path=/";}}catch(e){}})();',
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
