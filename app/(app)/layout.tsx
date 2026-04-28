import dynamic from "next/dynamic";
import { AppLayout } from "@takaki/go-design-system";

const KenyakuGoSidebar = dynamic(
  () =>
    import("@/components/kenyaku-sidebar").then((m) => ({
      default: m.KenyakuGoSidebar,
    })),
  { ssr: false },
);

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout sidebar={<KenyakuGoSidebar />}>{children}</AppLayout>;
}
