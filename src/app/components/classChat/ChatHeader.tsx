"use client";

import { Eye, EyeClosed } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import useShowSlide from "../room";

interface ChatHeaderProps {
  commentView: "all" | "unresolved" | "resolved";
  setCommentView: (view: "all" | "unresolved" | "resolved") => void;
}

export default function ChatHeader({ commentView, setCommentView }: ChatHeaderProps) {
  return (
    <>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <h1 className="text-xl font-bold">CSC209 Class Discussion</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">342 Online</span>
          <Avatar className="h-8 w-8">
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <header className="border-b px-6 py-4 flex items-center justify-left sticky top-0 bg-background gap-2 z-10">
        {useShowSlide() && (
          <Eye
            className="w-5 h-5 cursor-pointer text-foreground hover:text-primary"
            onClick={() => {}}
          />
        )}
        {!useShowSlide() && (
          <EyeClosed
            className="w-5 h-5 cursor-pointer text-foreground hover:text-primary"
            onClick={() => {}}
          />
        )}

        <FieldSet>
          <RadioGroup defaultValue={commentView} className="flex gap-2">
            <Field orientation="horizontal">
              <FieldLabel onClick={() => setCommentView("all")}>All</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel onClick={() => setCommentView("unresolved")}>Unresolved</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel onClick={() => setCommentView("resolved")}>Resolved</FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <Input className="h-10 " placeholder="Search comments..." />
      </header>
    </>
  );
}
