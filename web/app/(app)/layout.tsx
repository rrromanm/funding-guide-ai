import Sidebar from "@/components/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </>
  );
}
