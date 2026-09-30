"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRCode({ value, size = 96 }: { value: string; size?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}
