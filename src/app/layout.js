// File: app/layout.jsx
import Footer from "./components/Footer";
import ConditionalFooter from "./components/ConditionalFooter";
import "./globals.css";

export const metadata = {

  title: "Mahabali Price Action | Learn Professional Price Action Trading",

  description:
    "Mahabali Price Action is your ultimate resource to master price action trading. Learn chart reading, candlestick patterns, supply-demand, and real-world trading psychology from experts.",

  keywords: [
    "Mahabali Price Action",
    "price action trading",
    "learn trading online",
    "technical analysis",
    "trading education",
    "candlestick patterns",
    "forex trading course",
    "stock market training",
    "supply and demand trading",
    "price action strategy",
  ],

  authors: [{ name: "Mahabali Price Action" }],
  openGraph: {
    title: "Mahabali Price Action | Learn Professional Price Action Trading",
    description:
      "Master the art of price action trading with Mahabali Price Action. Learn real-world strategies for stock, forex, and crypto markets.",
    url: "https://mahabalipriceaction.com",
    siteName: "Mahabali Price Action",
    images: [
      {
        url: "/MahaBaliLogo.png",
        width: 800,
        height: 600,
        alt: "Mahabali Price Action Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/MahaBaliLogo.png",
    shortcut: "/MahaBaliLogo.png",
    apple: "/MahaBaliLogo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/MahaBaliLogo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="google-site-verification"
          content="<!-- add your Google Search Console verification code here -->"
        />

        {/* Meta Pixel Code - injected into the head so it runs as soon as possible on the client */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1528815018581131');
fbq('track', 'PageView');`,
          }}
        />
      </head>
      <body>
        {/* Noscript fallback for users with JS disabled */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1528815018581131&ev=PageView&noscript=1" />`,
          }}
        />

        {/* Optional: For the Next.js app router (single-page navigation) you should call fbq on route changes.
            Add the small client component below (components/FbPixelClient.jsx) and include <FbPixelClient /> here
            so PageView is tracked on route changes as well. */}

        {children}
        <ConditionalFooter />
      </body>
    </html>
  );
}


// ==========================
// File: components/FbPixelClient.jsx
// (Create this file and import it into the layout if you want SPA route-change tracking.)
// ==========================

// "use client";
// import { useEffect } from "react";
// import { usePathname } from "next/navigation";
//
// export default function FbPixelClient() {
//   const pathname = usePathname();
//
//   useEffect(() => {
//     // fbq is injected by the head script above. Only run on client.
//     if (typeof window !== "undefined" && window.fbq) {
//       window.fbq("track", "PageView");
//     }
//   }, [pathname]);
//
//   return null;
// }


// --------------------------
// Notes & usage
// --------------------------
// 1) Replace the Pixel ID '26021697834109599' with your real Pixel ID if different.
// 2) Place app/layout.jsx in your app/ directory (Next.js 13+ app router). Create components/FbPixelClient.jsx
//    with the code above and then import it into the layout (e.g. `import FbPixelClient from "./components/FbPixelClient";`)
//    and add <FbPixelClient /> just above {children} to track client-side navigation (recommended).
// 3) To track custom events (Lead, Purchase, etc.) call `window.fbq('track', 'Lead')` from client-side code (e.g. onClick handlers).
// 4) Verify with the Facebook Pixel Helper Chrome extension or in Events Manager.
// 5) If you prefer using next/script or want me to add the client component into the repo for you, tell me and I will update.
