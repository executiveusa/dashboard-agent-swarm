import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Successfully logged in.");
            navigate("/admin");
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="orb orb-a"></div>
            <div className="orb orb-b"></div>

            <Card className="w-full max-w-md border-border/50 bg-secondary/20 backdrop-blur-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Secure Access</CardTitle>
                    <CardDescription>
                        Enter your credentials to manage the agent swarm
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="email@archonx.os"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-background/50"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <style>{`
        .orb {
          position: fixed;
          border-radius: 999px;
          filter: blur(52px);
          opacity: 0.15;
          pointer-events: none;
          z-index: -1;
        }
        .orb-a {
          width: 30rem;
          height: 30rem;
          background: hsl(var(--primary));
          top: -10rem;
          left: -10rem;
        }
        .orb-b {
          width: 25rem;
          height: 25rem;
          background: hsl(var(--accent));
          bottom: -5rem;
          right: -5rem;
        }
      `}</style>
        </div>
    );
}
