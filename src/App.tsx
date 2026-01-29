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
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold tracking-[0.22em] text-primary uppercase font-heading">
                      YAPP Dashboard
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Mission control for Agent Zero and the crew
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <OrgSwitcher />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.7rem] font-medium text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Agent Zero live
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[0.7rem] font-medium text-accent">
                    env: prod
                  </span>
                </div>
              </div>
              <div className="p-6">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/agents" element={<AgentsConsole />} />
                  <Route path="/agents/cynthia/watch" element={<CynthiaWatch />} />
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
