import { Activity, Bot, FileText, FolderTree, GitFork, LayoutDashboard, LineChart, Settings, Terminal, Sparkles, Eye, Mic, Code2, MessageSquare, Rocket, Zap, Crown, Globe } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Mission Control", url: "/admin", icon: Activity },
  { title: "Command Center", url: "/admin/command-center", icon: Zap },
  { title: "King Mode", url: "/admin/king-mode", icon: Crown },
  { title: "Pauli's World", url: "/admin/paulis-world", icon: Globe },
  { title: "Agent Claw", url: "/admin/agent-claw", icon: Mic },
  { title: "Tasks", url: "/admin/tasks", icon: Terminal },
  { title: "Analytics", url: "/admin/analytics", icon: LineChart },
  { title: "Agents", url: "/admin/agents", icon: Bot },
  { title: "Devika", url: "/admin/agents/devika", icon: Code2 },
  { title: "Control", url: "/admin/control", icon: LayoutDashboard },
  { title: "Repos", url: "/admin/repos", icon: GitFork },
  { title: "Pauli's Place", url: "/admin/agents/meetings", icon: MessageSquare },
  { title: "Cynthia Watch", url: "/admin/agents/cynthia/watch", icon: Eye },
  { title: "Deploy", url: "/admin/deploy", icon: Rocket },
  { title: "Content", url: "/admin/content", icon: Sparkles },
  { title: "Logs", url: "/admin/logs", icon: FileText },
  { title: "Files", url: "/admin/files", icon: FolderTree },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Logo Badge */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">PE</span>
          </div>

          {/* Studio Name */}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                The Pauli Effect
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                Agent Dashboard
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isCollapsed ? "Nav" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}