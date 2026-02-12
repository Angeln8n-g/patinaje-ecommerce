"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
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
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setShouldShake(false);
    try {
      await signUp(values.email, values.password);
      toast.success("¡Cuenta creada exitosamente!");
      router.push("/skating-store");
    } catch (error: any) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      toast.error(error.message || "Error al registrarse");
    } finally {
      setIsLoading(false);
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
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold uppercase italic tracking-tighter">Crear Cuenta</h1>
          <p className="text-muted-foreground mt-2">Únete a nuestra comunidad</p>
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
                  <FormLabel>Contraseña</FormLabel>
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
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
              {isLoading ? "Cargando..." : "Registrarse"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline font-black uppercase tracking-wider">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>

      <Dialog open={showRegisterSuccess} onOpenChange={(open) => {
        setShowRegisterSuccess(open);
        if (!open) router.push("/login");
      }}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">¡Casi listo!</DialogTitle>
            <DialogDescription className="text-base pt-2 text-center">
              Hemos enviado un correo de confirmación a <strong>{form.getValues("email")}</strong>. 
              Por favor, verifica tu cuenta para poder iniciar sesión.
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
              onClick={() => {
                setShowRegisterSuccess(false);
                router.push("/login");
              }}
              className="w-full font-bold uppercase tracking-widest h-12 rounded-full"
            >
              Ir al Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
