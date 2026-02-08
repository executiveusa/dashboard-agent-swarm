import { Activity, Bot, FileText, FolderTree, LineChart, Settings, Terminal, Sparkles, Eye, Mic } from "lucide-react";
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
  { title: "Mission Control", url: "/", icon: Activity },
  { title: "Agent Claw", url: "/agent-claw", icon: Mic },
  { title: "Tasks", url: "/tasks", icon: Terminal },
  { title: "Analytics", url: "/analytics", icon: LineChart },
  { title: "Agents", url: "/agents", icon: Bot },
  { title: "Cynthia Watch", url: "/agents/cynthia/watch", icon: Eye },
  { title: "Content", url: "/content", icon: Sparkles },
  { title: "Logs", url: "/logs", icon: FileText },
  { title: "Files", url: "/files", icon: FolderTree },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          {/* DAR Badge */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-primary">
            <span className="text-sm font-bold text-primary-foreground">DAR</span>
          </div>
          
          {/* Studio Name - Hide when collapsed */}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-sidebar-foreground font-heading">
                DARYA Studio
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                Agentic mission control
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isCollapsed ? "Nav" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          isActive
                            ? "bg-primary/20 text-primary shadow-glow-primary"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
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