import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | Clinic Cloud +",
  description: "Sign in to the Clinic Cloud + demo workflow.",
};

export default function LoginPage() {
  return (
    <AuthFrame
      title="เข้าสู่ clinic workflow ที่ต้องการทดสอบ"
      description="เลือก Demo Account ตาม role แล้วทดลองข้อมูลและสิทธิ์การเข้าถึงที่ต่างกันบน Base Dataset เดียวกัน"
    >
      <LoginForm />
    </AuthFrame>
  );
}
