import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Tasks from "./pages/Tasks";
import Logs from "./pages/Logs";
import Files from "./pages/Files";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import AgentsConsole from "./pages/AgentsConsole";
import Content from "./pages/Content";
import CynthiaWatch from "./pages/CynthiaWatch";
import AgentClaw from "./pages/AgentClaw";
import DevikaAgent from "./pages/DevikaAgent";
import PauliMeetingRoom from "./pages/PauliMeetingRoom";
import DeployManager from "./pages/DeployManager";
import AnimatedCommandCenter from "./pages/AnimatedCommandCenter";
import KingMode from "./pages/KingMode";
import PaulisWorld from "./pages/PaulisWorld";
import NotFound from "./pages/NotFound";
import { OrgProvider } from "./contexts/OrgContext";
import { OrgSwitcher } from "./components/OrgSwitcher";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OrgProvider>
          <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background p-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      The Pauli Effect
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Agent fleet operations
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <OrgSwitcher />
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1 text-[0.7rem] font-medium text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Agent Zero live
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1 text-[0.7rem] font-medium text-muted-foreground">
                    env: prod
                  </span>
                </div>
              </div>
              <div className="p-6">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/command-center" element={<AnimatedCommandCenter />} />
                  <Route path="/king-mode" element={<KingMode />} />
                  <Route path="/paulis-world" element={<PaulisWorld />} />
                  <Route path="/agent-claw" element={<AgentClaw />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/agents" element={<AgentsConsole />} />
                  <Route path="/agents/cynthia/watch" element={<CynthiaWatch />} />
                  <Route path="/agents/devika" element={<DevikaAgent />} />
                  <Route path="/agents/meetings" element={<PauliMeetingRoom />} />
                  <Route path="/deploy" element={<DeployManager />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/files" element={<Files />} />
                  <Route path="/content" element={<Content />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </OrgProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
