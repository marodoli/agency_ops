"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { navItems, settingsNav, type NavItem } from "./sidebar-nav";

type SidebarUser = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

type SidebarProps = {
  user: SidebarUser;
  onNavClick?: () => void;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function NavLink({
  item,
  pathname,
  onNavClick,
  indented = false,
}: {
  item: NavItem;
  pathname: string;
  onNavClick?: () => void;
  indented?: boolean;
}) {
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  if (item.disabled) {
    return (
      <span
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm opacity-50 pointer-events-none",
          indented && "pl-10",
        )}
      >
        {item.icon && <item.icon className="size-4" />}
        <span>{item.label}</span>
        {item.badge && (
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
            {item.badge}
          </Badge>
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        indented && "pl-10",
        isActive
          ? "border-l-4 border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-secondary-600",
      )}
    >
      {item.icon && <item.icon className="size-4" />}
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ user, onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="p-6">
        <span className="text-lg font-semibold text-sidebar-foreground">
          MacroConsulting
        </span>
      </div>

      {/* Client selector placeholder */}
      <div className="px-4 pb-4">
        <Button
          variant="ghost"
          className="w-full justify-between text-sidebar-foreground/70 hover:bg-secondary-600 hover:text-sidebar-foreground"
        >
          <span className="text-sm">Vybrat klienta</span>
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <div key={item.href}>
            {item.children ? (
              <div className="space-y-1">
                <NavLink
                  item={item}
                  pathname={pathname}
                  onNavClick={onNavClick}
                />
                {item.children.map((child) => (
                  <NavLink
                    key={child.href}
                    item={child}
                    pathname={pathname}
                    onNavClick={onNavClick}
                    indented
                  />
                ))}
              </div>
            ) : (
              <NavLink
                item={item}
                pathname={pathname}
                onNavClick={onNavClick}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto px-3 pb-2">
        <NavLink
          item={settingsNav}
          pathname={pathname}
          onNavClick={onNavClick}
        />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className="flex items-center gap-3 p-4">
        <Avatar size="sm">
          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {user.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          className="text-sidebar-foreground/70 hover:bg-secondary-600 hover:text-sidebar-foreground"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Odhlásit se</span>
        </Button>
      </div>
    </div>
  );
}
