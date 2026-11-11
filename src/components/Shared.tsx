import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { avatarInitials } from "../social-model";

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return <span className={"person-avatar " + className} aria-hidden="true">{avatarInitials(name)}</span>;
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return <div className="soc-empty" role="status"><div className="soc-empty-icon"><Icon size={25} aria-hidden="true"/></div><h3>{title}</h3><p>{children}</p></div>;
}

export function timeISOString(timestamp: number | null): string | undefined {
  if (timestamp === null || !Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}
