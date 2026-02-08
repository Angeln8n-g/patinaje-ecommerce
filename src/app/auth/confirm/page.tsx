"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ConfirmState = "loading" | "success" | "expired" | "error";

export default function AuthConfirmPage() {
  const [state, setState] = useState<ConfirmState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleConfirmation = async () => {
      // Check hash fragment for errors (Supabase redirects with hash params)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");
      const errorCode = params.get("error_code");

      if (errorParam) {
        if (errorCode === "otp_expired") {
          setState("expired");
          setErrorMessage(
            "El enlace de confirmación ha expirado. Solicita uno nuevo."
          );
        } else {
          setState("error");
          setErrorMessage(
            errorDescription?.replace(/\+/g, " ") ||
              "Ocurrió un error al confirmar tu cuenta."
          );
        }
        return;
      }

      // Check if there's an access_token (successful confirmation)
      const accessToken = params.get("access_token");
      const type = params.get("type");

      if (accessToken) {
        // Supabase client auto-detects hash tokens via onAuthStateChange
        // Give it a moment to process
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setState("success");
          return;
        }
      }

      // Also check for code-based flow (PKCE)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        // The server callback should have handled this, but as fallback:
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setState("success");
          return;
        }
        setState("error");
        setErrorMessage("No se pudo verificar el código de confirmación.");
        return;
      }

      // If we got here with no tokens and no errors, check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setState("success");
        return;
      }

      // No tokens, no user — something went wrong
      setState("error");
      setErrorMessage("No se encontró información de confirmación.");
    };

    // Small delay to let Supabase client process hash tokens
    const timer = setTimeout(handleConfirmation, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) throw error;
      setResendSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al reenviar el correo.");
    } finally {
      setIsResending(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">
            Verificando tu cuenta...
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-card p-8 rounded-2xl border shadow-sm max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              ¡Cuenta Verificada!
            </h1>
            <p className="text-muted-foreground mt-2">
              Tu correo ha sido confirmado exitosamente. Ya puedes disfrutar de
              todas las funciones de la tienda.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => router.push("/skating-store")}
              className="w-full font-black uppercase tracking-widest h-12 rounded-full"
            >
              Ir a la Tienda
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/skating-store/perfil")}
              className="w-full font-bold"
            >
              Completar mi Perfil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // expired or error
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-card p-8 rounded-2xl border shadow-sm max-w-md w-full text-center space-y-6">
        <div
          className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${
            state === "expired" ? "bg-amber-100" : "bg-red-100"
          }`}
        >
          {state === "expired" ? (
            <RefreshCw className="h-12 w-12 text-amber-600" />
          ) : (
            <XCircle className="h-12 w-12 text-red-600" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            {state === "expired" ? "Enlace Expirado" : "Error de Verificación"}
          </h1>
          <p className="text-muted-foreground mt-2">{errorMessage}</p>
        </div>

        {/* Resend section */}
        {state === "expired" && !resendSuccess && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Ingresa tu correo para recibir un nuevo enlace:
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              onClick={handleResendConfirmation}
              disabled={isResending || !email.trim()}
              className="w-full font-black uppercase tracking-widest h-12 rounded-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Reenviar Enlace"
              )}
            </Button>
          </div>
        )}

        {resendSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-800 font-medium">
              ¡Correo enviado! Revisa tu bandeja de entrada.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/login" className="w-full">
            <Button
              variant="outline"
              className="w-full font-bold uppercase tracking-widest h-12 rounded-full"
            >
              Ir al Login
            </Button>
          </Link>
          <Link href="/skating-store">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Tienda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
