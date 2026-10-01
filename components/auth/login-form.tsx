"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, KeyRoundIcon } from "lucide-react";

import { FeedbackAlert, TextField } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FieldGroup,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const DEMO_PASSWORD = "12345678";

const DEMO_ACCOUNTS = [
  { role: "OWNER", email: "owner@cliniccloud.demo" },
  { role: "STAFF", email: "staff@cliniccloud.demo" },
  { role: "DOCTOR", email: "doctor@cliniccloud.demo" },
  { role: "NURSE", email: "nurse@cliniccloud.demo" },
  { role: "PATIENT", email: "patient@cliniccloud.demo" },
] as const;

type LoginFormProps = {
  onAuthenticated?: () => void;
};

type LoginError = {
  email?: string;
  password?: string;
  form?: string;
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectDemoAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginError = {};

    if (!email.trim()) {
      nextErrors.email = "กรุณากรอกอีเมล";
    }

    if (!password) {
      nextErrors.password = "กรุณากรอกรหัสผ่าน";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: {
          message?: string;
        };
      };

      if (!response.ok || !payload.ok) {
        setErrors({
          form:
            payload.error?.message ??
            "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง",
        });
        return;
      }

      if (onAuthenticated) {
        onAuthenticated();
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setErrors({
        form: "ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้ กรุณาลองอีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">Sign in</CardTitle>
          <CardDescription>
            ใช้ Demo Account เพื่อทดลอง workflow ของแต่ละ role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              {errors.form ? (
                <FeedbackAlert
                  tone="error"
                  title="เข้าสู่ระบบไม่สำเร็จ"
                  description={errors.form}
                />
              ) : null}

              <TextField
                id="login-email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
                required
              />

              <TextField
                id="login-password"
                name="password"
                type="password"
                label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                required
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                  </>
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-surface-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-primary" aria-hidden="true" />
            Demo accounts
          </CardTitle>
          <CardDescription>
            Password for all demo accounts:{" "}
            <span className="font-mono font-medium text-foreground">
              {DEMO_PASSWORD}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.role}
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => selectDemoAccount(account.email)}
            >
              <span className="min-w-16 text-left text-meta font-semibold">
                {account.role}
              </span>
              <span className="truncate text-muted-foreground">
                {account.email}
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        ยังไม่มีบัญชี?{" "}
        <Link
          href="/signup"
          className={cn(
            buttonVariants({ variant: "link", size: "sm" }),
            "h-auto p-0 align-baseline",
          )}
        >
          Signup
        </Link>
      </p>
    </div>
  );
}
