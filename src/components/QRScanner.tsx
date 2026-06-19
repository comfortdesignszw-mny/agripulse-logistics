import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (err) => {
        // Ignored - runs on every frame where no QR is found
      },
    );

    return () => {
      scanner.clear().catch((e) => console.error("Failed to clear scanner", e));
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800">
            Scan Digital Manifest
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 font-bold bg-slate-200 hover:bg-slate-300 w-6 h-6 rounded-full flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="p-4" id="qr-reader"></div>
        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 text-center font-bold">
            {error}
          </div>
        )}
        <div className="p-4 bg-slate-50 text-[10px] text-slate-500 text-center">
          Align the QR code within the frame to automatically verify the cargo
          ID locally.
        </div>
      </div>
    </div>
  );
}
