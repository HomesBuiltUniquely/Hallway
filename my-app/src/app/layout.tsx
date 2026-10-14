import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import AppLayout from "../components/layout/AppLayout";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hallway | HUB Digital Corridor",
  description: "Real-time performance velocity, leaderboards, and book of records for enterprise teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.className} ${manrope.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('hub-theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${manrope.className} min-h-full flex flex-col font-sans bg-app-bg text-app-fg transition-colors duration-200`}>
        <AppProvider>
          <AppLayout>{children}</AppLayout>
        </AppProvider>
      </body>
    </html>
  );
}
