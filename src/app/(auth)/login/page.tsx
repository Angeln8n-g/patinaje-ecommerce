"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LogIn, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showNotRegistered, setShowNotRegistered] = useState(false);
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setShouldShake(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("confirm") || error.message.toLowerCase().includes("verified")) {
          setShowEmailNotConfirmed(true);
          return;
        }
        throw error;
      }

      toast.success("¡Bienvenido de nuevo!");
      router.push("/skating-store");
    } catch (error: any) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email")?.trim();
    
    if (!email) {
      toast.error("Por favor, ingresa tu email en el campo correspondiente");
      form.setFocus("email");
      return;
    }

    const emailResult = z.string().email().safeParse(email);
    if (!emailResult.success) {
      toast.error("Por favor, ingresa un email válido");
      form.setFocus("email");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      
      if (error) {
        if (error.message.toLowerCase().includes("not found") || error.message.toLowerCase().includes("not registered")) {
          setShowNotRegistered(true);
          return;
        }
        throw error;
      }
      
      setShowResetSuccess(true);
    } catch (error: any) {
      console.error("Error en resetPassword:", error);
      toast.error(error.message || "Error al enviar el enlace de recuperación");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container max-w-md py-20 relative">
      <Link href="/skating-store" className="absolute top-8 left-4 md:left-0 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold uppercase text-xs tracking-widest group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Volver a la tienda
      </Link>

      <div className={cn(
        "bg-card p-8 rounded-lg border shadow-sm transition-transform mt-8",
        shouldShake && "animate-shake border-destructive shadow-destructive/20"
      )}>
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold uppercase italic tracking-tighter">Iniciar Sesión</h1>
          <p className="text-muted-foreground mt-2">Accede a tu cuenta para comprar</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="tu@email.com" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Contraseña</FormLabel>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isResetting}
                      className="text-xs text-primary hover:underline font-bold disabled:opacity-50"
                    >
                      {isResetting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                    </button>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="******" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-black uppercase tracking-widest h-12 rounded-full" disabled={isLoading}>
              {isLoading ? "Cargando..." : "Entrar"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary hover:underline font-black uppercase tracking-wider">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>

      <Dialog open={showResetSuccess} onOpenChange={setShowResetSuccess}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Correo Enviado</DialogTitle>
            <DialogDescription className="text-base pt-2 text-center">
              Hemos enviado un enlace de recuperación a <strong>{form.getValues("email")}</strong>. 
              Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button 
              onClick={() => setShowResetSuccess(false)}
              className="w-full font-black uppercase tracking-widest h-12 rounded-full"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotRegistered} onOpenChange={setShowNotRegistered}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-10 w-10 text-amber-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">No registrado</DialogTitle>
            <DialogDescription className="text-base pt-2 text-center">
              Parece que el correo <strong>{form.getValues("email")}</strong> no está registrado en nuestra base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/register" className="w-full">
              <Button className="w-full font-black uppercase tracking-widest h-12 rounded-full">
                Crear una cuenta
              </Button>
            </Link>
            <Button 
              variant="ghost"
              onClick={() => setShowNotRegistered(false)}
              className="w-full font-bold uppercase tracking-widest h-12 rounded-full"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailNotConfirmed} onOpenChange={setShowEmailNotConfirmed}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Confirma tu email</DialogTitle>
            <DialogDescription className="text-base pt-2 text-center">
              Debes confirmar tu registro antes de poder iniciar sesión. Revisa tu correo y haz clic en el enlace de verificación.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <a 
              href="https://mail.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full font-black uppercase tracking-widest h-12 rounded-full flex items-center justify-center gap-2 bg-[#EA4335] hover:bg-[#EA4335]/90">
                Ir a Gmail
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <Button 
              variant="ghost"
              onClick={() => setShowEmailNotConfirmed(false)}
              className="w-full font-bold uppercase tracking-widest h-12 rounded-full"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
