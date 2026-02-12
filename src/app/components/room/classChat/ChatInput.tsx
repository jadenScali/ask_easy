"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput() {
  return (
    <div className="border-t bg-stone-50 p-4 relative z-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4">
          <Textarea placeholder="Ask a question..." />
          <Button className="h-10 shrink-0 bg-stone-900 hover:bg-stone-700">Post</Button>
        </div>
      </div>
    </div>
  );
}
