"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/practice", label: "Practice" },
  { href: "/#how-it-works", label: "How it works" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-4">
      {LINKS.map((link) => {
        const active = link.href === "/practice" && pathname === "/practice";

        return (
          <Link
            key={link.href}
            className={`text-sm ${active ? "font-medium text-foreground" : "text-muted"}`}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
