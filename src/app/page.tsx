
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AetherLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Bot } from 'lucide-react';
import type { Session } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('aether-sessions');
      if (savedSessions) {
        const parsedSessions: Session[] = JSON.parse(savedSessions);
        // Sort sessions by createdAt date in descending order and take the top 5
        const sortedSessions = parsedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentSessions(sortedSessions.slice(0, 5));
      }
    } catch (error) {
      console.error("Failed to load sessions from localStorage", error);
    }
  }, []);

  const handleSessionClick = (sessionId: string) => {
    localStorage.setItem('aether-active-session', sessionId);
    router.push('/editor');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link href="#" className="flex items-center justify-center gap-2" prefetch={false}>
          <AetherLogo className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold font-headline">Aether UI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/editor" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Editor
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Generate Stunning UI with a single prompt
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Aether UI harnesses the power of generative AI to transform your text prompts and sketches into fully functional, production-ready UI components.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link
                    href="/editor"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    prefetch={false}
                  >
                    Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <img
                src="https://placehold.co/600x400.png"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="abstract ui generation"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
              />
            </div>
          </div>
        </section>

        {recentSessions.length > 0 && (
          <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Jump Back In</h2>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Continue working on your recent creations or start something new.
                  </p>
                </div>
              </div>
              <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 py-12">
                {recentSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-start gap-2 text-lg">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <Bot className="w-5 h-5" />
                        </div>
                        <span className="line-clamp-2">{session.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Aether UI. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
