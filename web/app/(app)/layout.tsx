import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Sidebar />
      <main className="min-w-0 flex-1 bg-canvas">{children}</main>
    </>
  );
}
