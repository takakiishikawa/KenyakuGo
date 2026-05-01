import { AppLayout } from "@takaki/go-design-system";
import { KenyakuGoSidebar } from "./client-sidebar";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout sidebar={<KenyakuGoSidebar />}>{children}</AppLayout>;
}
