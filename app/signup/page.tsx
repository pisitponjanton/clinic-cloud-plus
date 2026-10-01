import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/auth-frame";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Signup demo | Clinic Cloud +",
  description: "Clinic Cloud + demo-only signup experience.",
};

export default function SignupPage() {
  return (
    <AuthFrame
      title="ดู signup flow โดยไม่สร้างบัญชีจริง"
      description="Mockup นี้เก็บ predefined Demo Accounts เท่านั้น การ submit หน้า Signup จะไม่สร้างหรือบันทึกผู้ใช้ใหม่"
    >
      <SignupForm />
    </AuthFrame>
  );
}
