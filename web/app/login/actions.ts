"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error)
    redirect(`/login?error=${encodeURIComponent("Invalid email or password")}`);

  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent("This account is not authorised")}`,
    );
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
