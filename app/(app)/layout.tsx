import { AppLayout } from "@takaki/go-design-system";
import { KenyakuGoSidebar } from "@/components/kenyaku-sidebar";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout sidebar={<KenyakuGoSidebar />}>{children}</AppLayout>;
}
