"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Load Google Identity Services script
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google || !buttonRef.current || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: "100%",
      text: "continue_with",
      shape: "pill",
      locale: "es",
    });
  }, [scriptLoaded]);

  const handleCredentialResponse = async (response: { credential: string }) => {
    try {
      const user = await signInWithGoogle(response.credential);
      toast.success("¡Bienvenido!");

      if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "SELLER") {
        router.push("/seller");
      } else if (user.role === "DELIVERY") {
        router.push("/delivery");
      } else {
        router.push("/skating-store");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión con Google");
    }
  };

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="w-full">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">o continúa con</span>
        </div>
      </div>
      <div ref={buttonRef} className="flex justify-center [&>div]:!w-full" />
    </div>
  );
}
