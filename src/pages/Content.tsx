import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Send, FileText, Video, MessageSquare } from "lucide-react";
import { generateContentPack } from "@/services/daryaApi";
import type { ContentPack } from "@/types/api";

const Content = () => {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState("");
  const [targetUrls, setTargetUrls] = useState("");
  const [goal, setGoal] = useState("");
  const [contentPack, setContentPack] = useState<ContentPack | null>(null);

  const handleGenerate = async () => {
    if (!niche || !goal) {
      alert("Please fill in niche and goal");
      return;
    }

    setLoading(true);
    try {
      const urls = targetUrls
        .split("\n")
        .map(u => u.trim())
        .filter(u => u.length > 0);

      const result = await generateContentPack({
        orgId: "default-org", // TODO: Get from auth context
        niche,
        targetUrls: urls,
        goal,
      });

      setContentPack(result);
    } catch (error) {
      console.error("Content generation error:", error);
      alert("Failed to generate content pack. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
          Content Engine
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading">AI-Powered Content Generation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze competitors and generate blog posts, tutorials, and social content automatically.
        </p>
      </header>

      {/* Input Form */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content Pack
          </CardTitle>
          <CardDescription>
            Powered by Firecrawl + DARYA + Luna
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="niche">Niche / Industry</Label>
            <Input
              id="niche"
              placeholder="e.g., nonprofit fundraising, local roofing, beauty salon"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="urls">Competitor URLs (one per line)</Label>
            <Textarea
              id="urls"
              placeholder="https://competitor1.com&#10;https://competitor2.com&#10;https://competitor3.com"
              rows={5}
              value={targetUrls}
              onChange={(e) => setTargetUrls(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Firecrawl will analyze these sites for content ideas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Content Goal</Label>
            <Input
              id="goal"
              placeholder="e.g., drive traffic, generate leads, increase donations"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full gap-2 bg-gradient-primary hover:scale-105 transition-all"
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Content Pack
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {contentPack && (
        <div className="space-y-6">
          {/* Blog Posts */}
          {contentPack.blogPosts && contentPack.blogPosts.length > 0 && (
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Blog Post Outlines ({contentPack.blogPosts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contentPack.blogPosts.map((post, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground">{post.title}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(JSON.stringify(post, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Slug: {post.slug}</p>
                    <div className="flex flex-wrap gap-2">
                      {post.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Est. {post.estimatedWordCount} words
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tutorials */}
          {contentPack.tutorials && contentPack.tutorials.length > 0 && (
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Video className="h-5 w-5 text-accent" />
                  Tutorial Outlines ({contentPack.tutorials.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contentPack.tutorials.map((tutorial, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground">{tutorial.title}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(JSON.stringify(tutorial, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {tutorial.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tutorial.estimatedDuration}
                      </Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {tutorial.steps.slice(0, 3).map((step, i) => (
                        <li key={i}>• {step}</li>
                      ))}
                      {tutorial.steps.length > 3 && (
                        <li className="text-xs">+ {tutorial.steps.length - 3} more steps</li>
                      )}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Social Snippets */}
          {contentPack.socialSnippets && contentPack.socialSnippets.length > 0 && (
            <Card className="border-border/50 bg-card/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <MessageSquare className="h-5 w-5 text-success" />
                  Social Media Snippets ({contentPack.socialSnippets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contentPack.socialSnippets.map((snippet, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary">{snippet.platform}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(snippet.copy)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">{snippet.copy}</p>
                    <div className="flex flex-wrap gap-1">
                      {snippet.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs text-accent">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {snippet.imagePrompt && (
                      <p className="text-xs text-muted-foreground italic">
                        Image: {snippet.imagePrompt}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => copyToClipboard(JSON.stringify(contentPack, null, 2))}
                >
                  <Copy className="h-4 w-4" />
                  Copy All as JSON
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => alert("Send to UGC Pack feature coming in Phase 4")}
                >
                  <Send className="h-4 w-4" />
                  Send to UGC Pack
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Content;
