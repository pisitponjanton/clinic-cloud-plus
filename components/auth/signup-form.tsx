"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { FeedbackAlert, TextField } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const SIGNUP_NOTICE =
  "Demo MVP — การสมัครสมาชิกยังไม่เปิดใช้งาน กรุณาใช้ Demo Account เพื่อทดลองระบบ";

export function SignupForm() {
  const [showNotice, setShowNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowNotice(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">Signup</CardTitle>
          <CardDescription>
            หน้านี้ใช้เพื่อสาธิต flow เท่านั้น และจะไม่สร้างบัญชีใหม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {showNotice ? (
                <FeedbackAlert
                  tone="attention"
                  title="Demo MVP"
                  description={SIGNUP_NOTICE}
                />
              ) : null}

              <TextField
                id="signup-name"
                name="name"
                label="Display name"
                autoComplete="name"
                required
              />

              <TextField
                id="signup-email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                required
              />

              <TextField
                id="signup-password"
                name="password"
                type="password"
                label="Password"
                autoComplete="new-password"
                description="ข้อมูลนี้จะไม่ถูกบันทึกใน Demo MVP"
                required
              />

              <Button type="submit" size="lg" className="w-full">
                Continue
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        มี Demo Account แล้ว?{" "}
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "link", size: "sm" }),
            "h-auto p-0 align-baseline",
          )}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export { SIGNUP_NOTICE };
