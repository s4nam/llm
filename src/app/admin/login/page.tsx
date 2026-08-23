import type { Metadata } from "next";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Masuk Admin",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return <LoginForm mode="admin" />;
}