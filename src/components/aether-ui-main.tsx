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
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import * as LucideIcons from 'lucide-react';

import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger,
  Alert, AlertDescription, AlertTitle,
  Avatar as AvatarComponent, AvatarFallback as AvatarFallbackComponent, AvatarImage,
  Badge,
  Button as ButtonComponent,
  Calendar,
  Card as CardComponent, CardContent as CardContentComponent, CardDescription as CardDescriptionComponent, CardFooter, CardHeader as CardHeaderComponent, CardTitle as CardTitleComponent,
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
  ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent,
  Checkbox,
  Collapsible, CollapsibleContent, CollapsibleTrigger,
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger,
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input as InputComponent,
  Label,
  Menubar, MenubarCheckboxItem, MenubarContent, MenubarGroup, MenubarItem, MenubarLabel, MenubarMenu, MenubarPortal, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger,
  Popover, PopoverContent, PopoverTrigger,
  Progress,
  RadioGroup, RadioGroupItem,
  ScrollArea as ScrollAreaComponent, ScrollBar,
  Select as SelectComponent, SelectContent as SelectContentComponent, SelectGroup, SelectItem as SelectItemComponent, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger as SelectTriggerComponent, SelectValue as SelectValueComponent,
  Separator,
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger,
  Skeleton,
  Slider,
  Switch,
  Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
  Tabs as TabsComponent, TabsContent as TabsContentComponent, TabsList as TabsListComponent, TabsTrigger as TabsTriggerComponent,
  Textarea as TextareaComponent,
  Toast, ToastAction, ToastClose, ToastDescription, Toaster, ToastProvider, ToastTitle, ToastViewport,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from './ui';

const defaultInitialPrompt = "A modern, sleek login form with email and password fields, a submit button, and a 'forgot password' link. The form should be centered on the page. Use placeholders instead of labels.";

const getInitialSession = (): Session => ({
  id: uuidv4(),
  name: `Session ${new Date().toLocaleString()}`,
  createdAt: new Date().toISOString(),
  chatHistory: [{ id: uuidv4(), role: 'system', content: 'New session started.' }],
  jsxCode: '<p>Your component will appear here.</p>',
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
      const isFirstPrompt = activeSession.jsxCode.includes('Your component will appear here');
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

  const liveProviderScope = {
    React,
    useState,
    useEffect,
    ...LucideIcons,
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger,
    Alert, AlertDescription, AlertTitle,
    Avatar: AvatarComponent, AvatarFallback: AvatarFallbackComponent, AvatarImage,
    Badge,
    Button: ButtonComponent,
    Calendar,
    Card: CardComponent, CardContent: CardContentComponent, CardDescription: CardDescriptionComponent, CardFooter, CardHeader: CardHeaderComponent, CardTitle: CardTitleComponent,
    Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
    ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent,
    Checkbox,
    Collapsible, CollapsibleContent, CollapsibleTrigger,
    Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger,
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
    Input: InputComponent,
    Label,
    Menubar, MenubarCheckboxItem, MenubarContent, MenubarGroup, MenubarItem, MenubarLabel, MenubarMenu, MenubarPortal, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger,
    Popover, PopoverContent, PopoverTrigger,
    Progress,
    RadioGroup, RadioGroupItem,
    ScrollArea: ScrollAreaComponent, ScrollBar,
    Select: SelectComponent, SelectContent: SelectContentComponent, SelectGroup, SelectItem: SelectItemComponent, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger: SelectTriggerComponent, SelectValue: SelectValueComponent,
    Separator,
    Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger,
    Skeleton,
    Slider,
    Switch,
    Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
    Tabs: TabsComponent, TabsContent: TabsContentComponent, TabsList: TabsListComponent, TabsTrigger: TabsTriggerComponent,
    Textarea: TextareaComponent,
    Toast, ToastAction, ToastClose, ToastDescription, Toaster, ToastProvider, ToastTitle, ToastViewport,
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  };

  const preparedCode = useMemo(() => {
    if (!activeSession?.jsxCode) return '';
    
    // Initial placeholder
    if (activeSession.jsxCode.includes('Your component will appear here')) {
      return activeSession.jsxCode;
    }

    // Regular expression to find the component name from various definitions
    const componentNameMatch = activeSession.jsxCode.match(
      /export default function (\w+)|export default (\w+)|const (\w+) = \(\) =>/
    );

    const componentName = componentNameMatch ? (componentNameMatch[1] || componentNameMatch[2] || componentNameMatch[3]) : null;

    // Strip "export default" and trailing semicolon
    const cleanedCode = activeSession.jsxCode
      .replace(/export default\s+/, '')
      .replace(/;$/, '');

    if (componentName) {
      // Append the component tag to be rendered
      return `${cleanedCode}\n\nrender(<${componentName} />);`;
    }

    // Fallback for simple elements or if component name can't be found
    return cleanedCode;
  }, [activeSession?.jsxCode]);


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
          <Card className="flex-1 w-full shadow-lg relative">
            <style>{activeSession.cssCode}</style>
             <LiveProvider code={preparedCode} scope={liveProviderScope} noInline={true}>
              <div className="p-4 h-full w-full flex items-center justify-center">
                  <LivePreview />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-red-900 text-white p-2 font-mono text-xs">
                  <LiveError />
              </div>
            </LiveProvider>
          </Card>
        </div>
        
        {/* Right Panel */}
        <aside className="w-full xl:w-[500px] flex-shrink-0 border-t xl:border-t-0 xl:border-l border-border bg-card flex flex-col overflow-hidden">
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
