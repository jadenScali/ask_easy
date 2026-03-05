"use client";
import LandingPage from "./LandingPage";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans">
      <main className="flex-1">
        <LandingPage />
      </main>
    </div>
  );
}
