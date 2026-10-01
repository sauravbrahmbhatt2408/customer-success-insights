"use client";

import { LayoutDashboard, LogOut, MessageSquare, UserCircle, Users, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useLogoutMutation } from "@/store/api";
import { loggedOut } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/store";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Building2 },
  { href: "/interactions", label: "Interactions", icon: MessageSquare },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

const ROLE_LABELS = { admin: "Admin", manager: "Manager", csm: "CSM" };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [logout, { isLoading }] = useLogoutMutation();

  async function handleLogout() {
    try {
      await logout().unwrap();
    } finally {
      dispatch(loggedOut());
      dispatch(api.util.resetApiState());
      router.replace("/login");
    }
  }

  return (
    <aside className="flex shrink-0 flex-col border-b bg-background md:min-h-screen md:w-60 md:border-r md:border-b-0">
      <div className="px-5 py-4 text-sm font-semibold tracking-tight">Customer Success Insights</div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {LINKS.filter((link) => !link.adminOnly || user?.role === "admin").map(
          ({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname.startsWith(href) && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ),
        )}
      </nav>
      <div className="mt-auto hidden border-t p-4 md:block">
        <p className="truncate text-sm font-medium">{user?.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user && ROLE_LABELS[user.role]} · {user?.email}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={handleLogout}
          disabled={isLoading}
        >
          <LogOut />
          Log out
        </Button>
      </div>
      <div className="px-3 pb-3 md:hidden">
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoading}>
          <LogOut />
          Log out
        </Button>
      </div>
    </aside>
  );
}
