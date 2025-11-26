import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Key, Shield, Server, Zap } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
          Settings
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading">Studio Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your environment, API keys, and guardrails.
        </p>
      </header>

      {/* Environment */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Server className="h-4 w-4 text-primary" />
            Environment
          </CardTitle>
          <CardDescription>Current deployment environment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Production
            </Badge>
            <span className="text-sm text-muted-foreground">Read-only</span>
          </div>
        </CardContent>
      </Card>

      {/* LLM Providers */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Zap className="h-4 w-4 text-primary" />
            LLM Providers
          </CardTitle>
          <CardDescription>Configure model routing and API keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="litellm-url" className="text-sm">LiteLLM Base URL</Label>
            <Input 
              id="litellm-url" 
              type="text" 
              placeholder="https://litellm.example.com" 
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Route all LLM calls through LiteLLM gateway
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-key" className="text-sm">OpenAI API Key</Label>
            <Input 
              id="openai-key" 
              type="password" 
              placeholder="sk-..." 
              disabled
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anthropic-key" className="text-sm">Anthropic API Key</Label>
            <Input 
              id="anthropic-key" 
              type="password" 
              placeholder="sk-ant-..." 
              disabled
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="text-sm">Gemini API Key</Label>
            <Input 
              id="gemini-key" 
              type="password" 
              placeholder="AIza..." 
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Used for design ideation, images, and cost-effective tasks
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local-llm-url" className="text-sm">Local LLM URL (Optional)</Label>
            <Input 
              id="local-llm-url" 
              type="text" 
              placeholder="http://localhost:8000" 
              disabled
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Key className="h-4 w-4 text-accent" />
            Integrations
          </CardTitle>
          <CardDescription>External service API keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-key" className="text-sm">Stripe API Key</Label>
            <Input 
              id="stripe-key" 
              type="password" 
              placeholder="sk_live_..." 
              disabled
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firecrawl-key" className="text-sm">Firecrawl API Key</Label>
            <Input 
              id="firecrawl-key" 
              type="password" 
              placeholder="fc-..." 
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              For competitor research and content generation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-url" className="text-sm">WhatsApp API Base URL</Label>
            <Input 
              id="whatsapp-url" 
              type="text" 
              placeholder="https://graph.facebook.com/v18.0" 
              disabled
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-token" className="text-sm">WhatsApp API Token</Label>
            <Input 
              id="whatsapp-token" 
              type="password" 
              placeholder="EAAx..." 
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              For LATAM (Mexico) WhatsApp Business agent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-number" className="text-sm">WhatsApp Business Number</Label>
            <Input 
              id="whatsapp-number" 
              type="text" 
              placeholder="+52..." 
              disabled
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="n8n-url" className="text-sm">n8n Base URL</Label>
            <Input 
              id="n8n-url" 
              type="text" 
              placeholder="https://n8n.example.com" 
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Hosted on Hostinger for automation workflows
            </p>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            API key management will be enabled in Phase 3
          </p>
        </CardContent>
      </Card>

      {/* Guardrails */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Shield className="h-4 w-4 text-success" />
            Guardrails & Ethics
          </CardTitle>
          <CardDescription>System-wide safety constraints</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                No deceptive fundraising practices or misleading donor communications
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                Respect donor privacy and data protection regulations (GDPR, CCPA)
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                Transparent AI disclosure in all automated communications
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                No manipulation of vulnerable populations or high-pressure tactics
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                Agent Lightning cannot modify core ethics or legal guardrails
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                WhatsApp agents must identify as AI and provide human escalation option
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
              <span className="text-muted-foreground">
                Affiliate marketing must comply with FTC disclosure requirements
              </span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            These guardrails are immutable and enforced at the system level
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;