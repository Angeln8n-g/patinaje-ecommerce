"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  autoStart?: boolean;
}

export function BarcodeScanner({ onScan, autoStart = false }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(autoStart);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const onScanRef = useRef(onScan);

  // Keep the callback ref updated without triggering effect re-runs
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!isScanning) return;

    // Small delay to ensure the DOM element is rendered
    const timeoutId = setTimeout(() => {
      if (scannerRef.current) return;

      const container = document.getElementById("barcode-reader");
      if (!container) return;

      const scanner = new Html5QrcodeScanner(
        "barcode-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          rememberLastUsedCamera: true,
          aspectRatio: 1.777778,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          onScanRef.current(decodedText);
        },
        () => {
          // Silent errors during scan are normal
        }
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const toggleScanner = () => {
    setIsScanning(!isScanning);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button
          variant={isScanning ? "destructive" : "default"}
          onClick={toggleScanner}
          className="gap-2"
        >
          {isScanning ? (
            <>
              <StopCircle className="h-4 w-4" />
              Detener Cámara
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Iniciar Cámara
            </>
          )}
        </Button>
      </div>

      <div
        id="barcode-reader"
        className={`mx-auto overflow-hidden rounded-lg border bg-black/5 ${isScanning ? "block" : "hidden"}`}
        style={{ maxWidth: "500px" }}
      ></div>

      {!isScanning && (
        <div className="text-center text-sm text-muted-foreground">
          También puedes usar un lector USB directamente en los campos de entrada.
        </div>
      )}
    </div>
  );
}
