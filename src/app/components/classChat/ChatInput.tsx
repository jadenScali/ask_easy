"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput() {
  return (
    <div className="border-t bg-background p-4 relative z-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4">
          <Textarea placeholder="Add to the discussion..." className="min-h-[60px]" />
          <Button className="h-10 bg-foreground ">Post</Button>
        </div>
      </div>
    </div>
  );
}
