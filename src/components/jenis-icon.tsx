"use client";

import {
  Stethoscope,
  Hospital,
  Pill,
  Home,
  GraduationCap,
  BookOpen,
  ArrowLeftRight,
  ClipboardList,
  FileText,
  Syringe,
  HeartPulse,
  Baby,
  Building2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Stethoscope,
  Hospital,
  Pill,
  Home,
  GraduationCap,
  BookOpen,
  ArrowLeftRight,
  ClipboardList,
  FileText,
  Syringe,
  HeartPulse,
  Baby,
  Building2,
  ShieldCheck,
};

export const ICON_CHOICES = Object.keys(ICON_MAP);

export function JenisIcon({
  icon,
  className,
  style,
}: {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Ic = ICON_MAP[icon] ?? FileText;
  return <Ic className={className} style={style} />;
}
