import { Home, Search, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  badge?: string;
  children?: NavItem[];
};

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    label: "SEO",
    href: "/seo",
    icon: Search,
    children: [
      {
        label: "Technický audit",
        href: "/seo/technical-audit",
      },
      {
        label: "Keyword analýza",
        href: "/seo/keyword-analysis",
        disabled: true,
        badge: "Brzy",
      },
    ],
  },
];

export const settingsNav: NavItem = {
  label: "Nastavení",
  href: "/settings",
  icon: Settings,
};
