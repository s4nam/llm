import type { Metadata } from "next";
import AdminSetupPage from "./admin-setup";

export const metadata: Metadata = {
  title: "Klaim Admin",
  robots: { index: false },
};

export default function AdminSetupRoute() {
  return <AdminSetupPage />;
}
