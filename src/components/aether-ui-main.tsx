"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateUiComponent } from '@/ai/flows/generate-ui-component';
import { iterativelyRefineUIComponent } from '@/ai/flows/iteratively-refine-component';
import type { Session, Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AetherLogo } from '@/components/icons';
import { Bot, ChevronRight, Clipboard, Download, Loader, Plus, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Textarea } from './ui/textarea';

const createPreviewHtml = (jsx: string, css: string) => {
  // A more robust way to extract the component body
  const bodyMatch = jsx.match(/export default function \w+\(\) {([\s\S]*)}/);
  
  // If the match fails, it might be an arrow function or different export style.
  // Fallback for arrow functions: export default () => { ... }
  const bodyMatchArrow = jsx.match(/export default \(\) => {([\s\S]*)}/);

  let componentBody = '';
  if (bodyMatch && bodyMatch[1]) {
    componentBody = bodyMatch[1];
  } else if (bodyMatchArrow && bodyMatchArrow[1]) {
    componentBody = bodyMatchArrow[1];
  } else {
    // A fallback that removes the export and function definition, less reliable
    componentBody = jsx.replace(/export default function \w+\(\) {/, '').replace(/}$/, '');
  }

  // Remove imports as they are not needed in the preview sandbox
  const cleanJsx = componentBody.replace(/import .*/g, '');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Component Preview</title>
        <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
        <style>
          body { 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            background-color: transparent;
          }
          #root {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 1rem;
            box-sizing: border-box;
          }
          ${css}
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          try {
            // Define a stateless functional component
            const Component = () => {
              ${cleanJsx}
            };
            ReactDOM.render(<Component />, document.getElementById('root'));
          } catch (e) {
            // If there's an error, display it in the preview
            const root = document.getElementById('root');
            root.innerHTML = '<pre style="color: red; padding: 1rem;">' + e.message.replace(/</g, "&lt;") + '</pre>';
          }
        </script>
      </body>
    </html>
  `;
};

const defaultInitialPrompt = "A modern, sleek login form with email and password fields, a submit button, and a 'forgot password' link. The form should be centered on the page. Use placeholders instead of labels.";

const getInitialSession = (): Session => ({
  id: uuidv4(),
  name: `Session ${new Date().toLocaleString()}`,
  createdAt: new Date().toISOString(),
  chatHistory: [{ id: uuidv4(), role: 'system', content: 'New session started.' }],
  jsxCode: '// Your component code will appear here',
  cssCode: '/* Your component CSS will appear here */',
});

export function AetherUIMain() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const savedSessions = localStorage.getItem('aether-sessions');
      const savedActiveId = localStorage.getItem('aether-active-session');
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        if (savedActiveId && parsedSessions.some((s: Session) => s.id === savedActiveId)) {
          setActiveSessionId(savedActiveId);
        } else if (parsedSessions.length > 0) {
          setActiveSessionId(parsedSessions[0].id);
        } else {
          handleNewSession();
        }
      } else {
        handleNewSession();
      }
    } catch (error) {
      console.error("Failed to load sessions from localStorage", error);
      handleNewSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient && sessions.length > 0) {
      localStorage.setItem('aether-sessions', JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem('aether-active-session', activeSessionId);
      }
    }
  }, [sessions, activeSessionId, isClient]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId);
  }, [sessions, activeSessionId]);

  const updateActiveSession = (update: Partial<Session> | ((s: Session) => Partial<Session>)) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const changes = typeof update === 'function' ? update(s) : update;
        return { ...s, ...changes };
      }
      return s;
    }));
  };

  const handleNewSession = () => {
    const newSession = getInitialSession();
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };
  
  const handleSelectSession = (sessionId: string) => {
    if (sessions.find(s => s.id === sessionId)) {
      setActiveSessionId(sessionId);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length <= 1) {
        toast({
            title: "Cannot delete the last session",
            description: "Create a new session before deleting this one.",
            variant: "destructive"
        });
        return;
    }
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.filter(s => s.id !== sessionId)[0]?.id || null);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !activeSession) return;
  
    const userMessage: Message = { id: uuidv4(), role: 'user', content: prompt };
    updateActiveSession(s => ({
      chatHistory: [...s.chatHistory, userMessage]
    }));
    setPrompt('');
    setIsLoading(true);
  
    try {
      const isFirstPrompt = activeSession.jsxCode.startsWith('//');
      let response;
      if (isFirstPrompt) {
        response = await generateUiComponent({ prompt });
      } else {
        response = await iterativelyRefineUIComponent({
          userPrompt: prompt,
          baseComponentCode: activeSession.jsxCode,
          existingCss: activeSession.cssCode,
        });
      }
  
      const { jsxTsxCode, cssCode } = 'jsxTsxCode' in response ? response : { jsxTsxCode: response.refinedComponentCode, cssCode: response.refinedCss || '' };
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I've updated the component based on your request.`,
      };
      
      updateActiveSession(s => ({
        chatHistory: [...s.chatHistory, assistantMessage],
        jsxCode: jsxTsxCode,
        cssCode: cssCode,
      }));
  
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = { id: uuidv4(), role: 'system', content: 'An error occurred. Please try again.' };
      updateActiveSession(s => ({ chatHistory: [...s.chatHistory, errorMessage] }));
      toast({
        title: "AI Error",
        description: "Could not generate component. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineWithPrompt = async (refinementPrompt: string) => {
    if (!refinementPrompt.trim() || isLoading || !activeSession) return;
  
    const userMessage: Message = { id: uuidv4(), role: 'user', content: refinementPrompt };
    updateActiveSession(s => ({ chatHistory: [...s.chatHistory, userMessage] }));
    setIsLoading(true);
  
    try {
      const response = await iterativelyRefineUIComponent({
          userPrompt: refinementPrompt,
          baseComponentCode: activeSession.jsxCode,
          existingCss: activeSession.cssCode,
      });
      const { refinedComponentCode, refinedCss } = response;
      const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: `I've refined the component.` };
      
      updateActiveSession(s => ({
        chatHistory: [...s.chatHistory, assistantMessage],
        jsxCode: refinedComponentCode,
        cssCode: refinedCss || s.cssCode,
      }));
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = { id: uuidv4(), role: 'system', content: 'An error occurred during refinement.' };
      updateActiveSession(s => ({ chatHistory: [...s.chatHistory, errorMessage] }));
      toast({ title: "AI Error", description: "Could not refine component.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `${type} Copied!`, description: "The code has been copied to your clipboard." });
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeSession?.chatHistory]);

  const previewContent = useMemo(() => {
    if (!activeSession) return '';
    return createPreviewHtml(activeSession.jsxCode, activeSession.cssCode);
  }, [activeSession]);

  if (!isClient || !activeSession) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader className="animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen w-full bg-background font-body text-foreground">
      {/* Left Panel: Chat & Sessions */}
      <aside className="w-[380px] flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <AetherLogo className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">Aether UI</h1>
          </div>
          <div className="flex gap-2">
            <Select value={activeSessionId || ''} onValueChange={handleSelectSession}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleNewSession} aria-label="New Session"><Plus /></Button>
            <Button variant="destructive" size="icon" onClick={() => handleDeleteSession(activeSessionId!)} aria-label="Delete Session"><Trash2 /></Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1" ref={chatContainerRef}>
          <div className="p-4 space-y-6">
            {activeSession.chatHistory.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{msg.role === 'assistant' ? <Bot /> : 'S'}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`rounded-lg px-4 py-2 max-w-[80%] text-sm ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                } ${msg.role === 'system' ? 'w-full text-center bg-transparent text-muted-foreground text-xs italic' : ''}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                <div className="rounded-lg px-4 py-2 max-w-[80%] text-sm bg-muted flex items-center gap-2">
                  <Loader className="animate-spin h-4 w-4" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border flex-shrink-0">
          <form onSubmit={handlePromptSubmit} className="flex gap-2">
            <Input 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the component you want..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !prompt.trim()} size="icon" aria-label="Send">
              <ChevronRight />
            </Button>
          </form>
           <Button variant="link" className="p-0 h-auto mt-2 text-xs" onClick={() => !isLoading && setPrompt(defaultInitialPrompt)}>
             Try an example: A modern login form
           </Button>
        </div>
      </aside>

      {/* Main Content: Preview, Code, Properties */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Preview Panel */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          <h2 className="text-lg font-semibold tracking-tight">Live Preview</h2>
          <Card className="flex-1 w-full shadow-lg">
            <iframe
              srcDoc={previewContent}
              title="Component Preview"
              className="w-full h-full border-0 rounded-lg"
              sandbox="allow-scripts"
            />
          </Card>
        </div>
        
        {/* Right Panel */}
        <aside className="w-full xl:w-[50%] xl:max-w-3xl flex-shrink-0 border-t xl:border-t-0 xl:border-l border-border bg-card flex flex-col overflow-hidden">
          <Tabs defaultValue="jsx" className="flex-1 flex flex-col">
            <div className="flex-shrink-0 px-4 pt-4 flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="jsx">JSX</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="refine">Refine</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleCopyCode(activeSession.jsxCode, 'JSX')} aria-label="Copy JSX"><Clipboard /></Button>
                <Button variant="ghost" size="icon" disabled aria-label="Download Code"><Download /></Button>
              </div>
            </div>
            
            <TabsContent value="jsx" className="flex-1 m-0 overflow-y-auto">
              <ScrollArea className="h-full">
                <pre className="text-sm p-4 font-code w-full h-full"><code className="language-jsx">{activeSession.jsxCode}</code></pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="css" className="flex-1 m-0 overflow-y-auto">
              <ScrollArea className="h-full">
                <pre className="text-sm p-4 font-code w-full h-full"><code className="language-css">{activeSession.cssCode}</code></pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="refine" className="p-4 m-0">
               <PropertyEditor onRefine={handleRefineWithPrompt} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </aside>
      </main>
    </div>
  );
}


function PropertyEditor({ onRefine, isLoading }: { onRefine: (prompt: string) => void, isLoading: boolean }) {
  const [refinePrompt, setRefinePrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRefine(refinePrompt);
    setRefinePrompt('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iterative Refinement</CardTitle>
        <CardDescription>
          Provide follow-up instructions to modify the component.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="e.g., 'Make the button purple' or 'Add a field for username'"
            className="h-24"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !refinePrompt.trim()} className="w-full">
            {isLoading ? <Loader className="animate-spin mr-2" /> : null}
            Refine Component
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
