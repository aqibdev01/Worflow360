"use client";

import { Hash, MessageSquare } from "lucide-react";

export default function CommunicationPage() {
  return (
    <div className="flex-1 flex items-center justify-center text-center px-4 bg-[#FAFBFD]">
      <div>
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-navy-900 mb-1">
          Welcome to Communication Hub
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Select a channel or direct message from the sidebar to start
          chatting with your team.
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            <span>Channels</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Direct Messages</span>
          </div>
        </div>
      </div>
    </div>
  );
}
