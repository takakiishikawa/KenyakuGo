"use client";

import dynamic from "next/dynamic";

const Analytics = dynamic(
  () =>
    import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
  { ssr: false },
);

const Toaster = dynamic(
  () =>
    import("@takaki/go-design-system").then((m) => ({ default: m.Toaster })),
  { ssr: false },
);

export function ClientProviders() {
  return (
    <>
      <Toaster />
      <Analytics />
    </>
  );
}
