import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}.*$/i;

export function CommandInput() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url.trim()) {
      toast.error("Enter a YouTube URL", {
        description: "Paste a valid YouTube link to start an analysis.",
      });
      return;
    }

    if (!YOUTUBE_URL_PATTERN.test(url.trim())) {
      toast.error("Unsupported URL", {
        description: "Only youtube.com and youtu.be links are accepted.",
      });
      return;
    }

    setIsSubmitting(true);

    // Temporary stub until the job queue and API are wired up.
    setTimeout(() => {
      toast.success("Analysis queued", {
        description: "The video will appear in the Jobs list shortly.",
      });
      setUrl("");
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Video Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Queueing..." : "Run analysis"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default CommandInput;
