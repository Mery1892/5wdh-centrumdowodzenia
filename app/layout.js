import PwaRegister from "./pwa-register";

export const metadata = {
  title: "5 WDH — Centrum Dowodzenia",
  description: "Centrum Dowodzenia 5 WDH Czerwone Berety",
  manifest: "/manifest.webmanifest",
  applicationName: "5 WDH",
  appleWebApp: {
    capable: true,
    title: "5 WDH",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  themeColor: "#173b2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
