"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setError("Enlace inválido. Solicita un nuevo enlace de recuperación.");
    }
  }, [token]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await apiClient("/api/auth/reset-password", {
        method: "POST",
        body: { token, password: values.password },
      });
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Error al restablecer la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container max-w-md py-20">
        <div className="bg-card p-8 rounded-lg border shadow-sm text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">¡Listo!</h1>
          <p className="text-muted-foreground mt-2">Tu contraseña ha sido actualizada correctamente.</p>
          <Button onClick={() => router.push("/login")} className="w-full font-black uppercase tracking-widest h-12 rounded-full mt-6">
            Ir al Login
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-md py-20">
        <div className="bg-card p-8 rounded-lg border shadow-sm text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Enlace Inválido</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => router.push("/login")} className="w-full font-black uppercase tracking-widest h-12 rounded-full mt-6">
            Volver al Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-20 relative">
      <Link href="/login" className="absolute top-8 left-4 md:left-0 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold uppercase text-xs tracking-widest group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Volver al login
      </Link>
      <div className="bg-card p-8 rounded-lg border shadow-sm text-center mt-8">
        <div className="mb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold uppercase italic tracking-tighter">Nueva Contraseña</h1>
          <p className="text-muted-foreground mt-2">Ingresa tu nueva contraseña a continuación</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva Contraseña</FormLabel>
                <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Contraseña</FormLabel>
                <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full font-black uppercase tracking-widest h-12 rounded-full" disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Restablecer Contraseña"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-md py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
