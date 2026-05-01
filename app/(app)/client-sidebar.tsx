"use client";

import dynamic from "next/dynamic";

export const KenyakuGoSidebar = dynamic(
  () =>
    import("@/components/kenyaku-sidebar").then((m) => ({
      default: m.KenyakuGoSidebar,
    })),
  { ssr: false },
);
