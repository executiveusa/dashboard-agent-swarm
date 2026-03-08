import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Bot,
  Zap,
  Shield,
  Cpu,
  Globe,
  Database,
  Terminal,
  ChevronRight,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const [stats, setStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    failed_tasks: 0,
    success_rate: 0,
    tokens_saved: 0,
    cost_avoided: 0,
    uptime_seconds: 0
  });

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      console.error("Failed to fetch agents", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStats(), fetchAgents()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(() => {
      fetchStats();
      fetchAgents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#030711] text-slate-200 relative overflow-hidden p-6 lg:p-10 font-outfit">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              KING MODE <span className="text-blue-500/80 text-lg ml-2 font-medium">v2.0.0</span>
            </h1>
          </div>
          <p className="text-slate-400 max-w-md">
            Operational awareness for the ArchonX 64-Agent Swarm. Automated via Zero-Touch Engineering protocol.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">CORE KERNEL ONLINE</span>
          </div>
          <Button className="bg-white text-black hover:bg-slate-200 rounded-full px-6 transition-all duration-300 transform hover:scale-105">
            <Plus className="w-4 h-4 mr-2" /> NEW MISSION
          </Button>
        </motion.div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Active Nodes", value: agents.filter(a => a.status === 'active' || a.status === 'busy').length, icon: Bot, color: "blue" },
          { label: "Mission Velocity", value: stats.total_tasks, icon: Zap, color: "amber" },
          { label: "Token Savings", value: `${(stats.tokens_saved / 1000).toFixed(1)}k`, icon: Database, color: "emerald" },
          { label: "Cost Avoided", value: `$${stats.cost_avoided}`, icon: Shield, color: "purple" }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-${stat.color}-500/10 transition-all`} />
              <CardHeader className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <stat.icon className={`w-8 h-8 text-${stat.color}-500`} />
                  <Badge variant="outline" className="border-slate-800 text-slate-400">+12%</Badge>
                </div>
                <CardTitle className="text-slate-400 text-sm font-medium uppercase tracking-wider">{stat.label}</CardTitle>
                <div className="text-4xl font-bold mt-1 text-white tabular-nums">{stat.value}</div>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Agents List */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl h-full">
            <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Swarm Roster</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Real-time status of all 64 specialized units.</p>
              </div>
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                View All <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {agents.map((agent) => (
                  <div key={agent.id} className="group flex items-center justify-between p-4 bg-slate-900/30 border border-white/5 rounded-2xl hover:bg-slate-800/40 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                          <Bot className={`w-6 h-6 ${agent.status === 'busy' ? 'text-amber-500' : 'text-blue-500'}`} />
                        </div>
                        {agent.status === 'active' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#030711] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{agent.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="uppercase">{agent.role}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full" />
                          <span>{agent.position}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="hidden md:block">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Success Rate</div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${agent.health * 100}%` }}
                              className="h-full bg-blue-500"
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-300">{Math.round(agent.health * 100)}%</span>
                        </div>
                      </div>
                      <Badge className={`${agent.status === 'busy' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'} border-none px-3`}>
                        {agent.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Theater / Events */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl h-full flex flex-col">
            <CardHeader className="p-6 border-b border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-lg">Live Theater</CardTitle>
              </div>
              <p className="text-xs text-slate-500">Sub-second event stream from the swarm core.</p>
            </CardHeader>
            <CardContent className="p-6 flex-grow flex flex-col">
              <div className="flex-grow space-y-4 font-mono text-xs">
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-slate-400">
                  <span className="text-emerald-500 mr-2">[14:22:01]</span>
                  <span className="text-white">SYNTHIA</span> dispatched to PHASE 3 EXECUTION.
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-slate-400">
                  <span className="text-emerald-500 mr-2">[14:22:15]</span>
                  <span className="text-white">VAULT</span> keys injected into RALPHY environment.
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-slate-400">
                  <span className="text-emerald-500 mr-2">[14:23:40]</span>
                  <span className="text-white">BLITZ</span> initiating build loop for dashboard.
                </div>
                <div className="flex-grow" />
              </div>
              <div className="mt-6">
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-blue-500 uppercase">System Uptime</span>
                    <span className="text-xs font-mono text-white tracking-widest">00:00:{stats.uptime_seconds}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className={`h-1 flex-grow rounded-full ${i < 15 ? 'bg-blue-500' : 'bg-slate-800'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
