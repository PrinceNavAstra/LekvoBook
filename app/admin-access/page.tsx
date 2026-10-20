import { redirect } from "next/navigation";

// Owner/Admin sign-in and first-time setup now live inside the Super Admin area.
export default function AdminAccessPage() {
  redirect("/super-admin");
}
