
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Image from 'next/image';
import Link from 'next/link';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelGroupHandle,
} from "react-resizable-panels"
import Editor, { OnMount } from '@monaco-editor/react';

import { generateUiComponent } from '@/ai/flows/generate-ui-component';
import { iterativelyRefineUIComponent } from '@/ai/flows/iteratively-refine-component';
import { askAiAboutCode } from '@/ai/flows/ask-ai-about-code';
import type { Session, Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AetherLogo } from '@/components/icons';
import { Bot, ChevronRight, Clipboard, Download, Loader, Plus, Trash2, User, PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen, Paperclip, XCircle, Smartphone, Monitor, Undo2, Redo2, MessageSquareQuote } from 'lucide-react';
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

const creativeSessionNames = [
    "Cosmic Canvas", "Quantum Query", "Starlight Sketch", "Nebula Nudge", "Aether Architect",
    "Pixel Weave", "Code Comet", "Syntax Starship", "Orion UI", "Galaxy Grids",
    "Celestial Component", "Meteor Mockup", "Pulsar Prototype", "Void Visuals", "Infinity Interface"
];

const getInitialSession = (): Session => {
    const initialCode = {
        jsxCode: '<div data-aether-id="el-1">Your component will appear here.</div>',
        cssCode: '/* Your component CSS will appear here */'
    };
    return {
        id: uuidv4(),
        name: creativeSessionNames[Math.floor(Math.random() * creativeSessionNames.length)],
        createdAt: new Date().toISOString(),
        chatHistory: [{ id: uuidv4(), role: 'system', content: 'New session started.' }],
        ...initialCode,
        uploadedImage: null,
        codeHistory: [initialCode],
        currentVersion: 0,
        selectedElementId: null,
    };
};

export function AetherUIMain() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedCode, setSelectedCode] = useState<{ code: string; type: 'jsx' | 'css' } | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const editorRef = useRef<any>(null);


  useEffect(() => {
    setIsClient(true);
    try {
      const savedSessions = localStorage.getItem('aether-sessions');
      const savedActiveId = localStorage.getItem('aether-active-session');
      if (savedSessions) {
        const parsedSessions: Session[] = JSON.parse(savedSessions);
        
        // Migration for older sessions
        const migratedSessions = parsedSessions.map(session => {
          let migratedSession = { ...session };
          if (!migratedSession.codeHistory) {
            migratedSession.codeHistory = [{ jsxCode: session.jsxCode, cssCode: session.cssCode }];
            migratedSession.currentVersion = 0;
          }
          if (migratedSession.selectedElementId === undefined) {
             migratedSession.selectedElementId = null;
          }
          return migratedSession;
        });

        setSessions(migratedSessions);
        if (savedActiveId && migratedSessions.some((s: Session) => s.id === savedActiveId)) {
          setActiveSessionId(savedActiveId);
        } else if (migratedSessions.length > 0) {
          setActiveSessionId(migratedSessions[0].id);
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
    setSessions(prev => [newSession, ...prev]);
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

    const userMessage: Message = { 
      id: uuidv4(), 
      role: 'user', 
      content: prompt,
      imageUrl: activeSession.uploadedImage 
    };

    let sessionNameUpdate = {};
    const isFirstUserPrompt = activeSession.chatHistory.length === 1 && activeSession.chatHistory[0].role === 'system';
    if (isFirstUserPrompt) {
        sessionNameUpdate = { name: prompt.substring(0, 40) + (prompt.length > 40 ? '...' : '') };
    }

    updateActiveSession(s => ({
      ...sessionNameUpdate,
      chatHistory: [...s.chatHistory, userMessage],
      uploadedImage: null, // Move image from temp state to chat history
    }));

    setPrompt('');
    setIsLoading(true);

    try {
      const isFirstPrompt = activeSession.jsxCode.includes('Your component will appear here');
      
      const codeSelectionMatch = prompt.match(/```(jsx|css)\n([\s\S]*?)\n```\n/);

      if (codeSelectionMatch) {
          const [_, lang, codeSnippet] = codeSelectionMatch;
          const userQuery = prompt.replace(codeSelectionMatch[0], '').trim();
          
          const response = await askAiAboutCode({
              codeSnippet,
              userPrompt: userQuery,
          });

          if (response.responseType === 'explanation') {
              const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: response.explanation! };
              updateActiveSession(s => ({ chatHistory: [...s.chatHistory, assistantMessage] }));
          } else if (response.responseType === 'code_update' && response.updatedCode) {
              const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: `I've updated the code based on your request.` };
              
              let updatedJsx = activeSession.jsxCode;
              let updatedCss = activeSession.cssCode;

              if (lang === 'jsx') {
                  updatedJsx = activeSession.jsxCode.replace(codeSnippet, response.updatedCode);
              } else {
                  updatedCss = activeSession.cssCode.replace(codeSnippet, response.updatedCode);
              }

              updateActiveSession(s => {
                  const newVersion = { jsxCode: updatedJsx, cssCode: updatedCss };
                  const currentHistory = Array.isArray(s.codeHistory) ? s.codeHistory : [{ jsxCode: s.jsxCode, cssCode: s.cssCode }];
                  const currentV = s.currentVersion ?? 0;
                  const history = currentHistory.slice(0, currentV + 1);
                  const newHistory = [...history, newVersion].slice(-5);

                  return {
                      chatHistory: [...s.chatHistory, assistantMessage],
                      jsxCode: newVersion.jsxCode,
                      cssCode: newVersion.cssCode,
                      codeHistory: newHistory,
                      currentVersion: newHistory.length - 1,
                  }
              });
          }
      } else if (isFirstPrompt) {
        const response = await generateUiComponent({
          prompt,
          imageDataUri: userMessage.imageUrl || undefined,
        });
        const { jsxTsxCode, cssCode } = response;
        const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: `I've created the component based on your request.` };
        updateActiveSession(s => {
          const newVersion = { jsxCode: jsxTsxCode, cssCode };
          const newHistory = [newVersion];
          return {
            chatHistory: [...s.chatHistory, assistantMessage],
            ...newVersion,
            codeHistory: newHistory,
            currentVersion: 0,
          }
        });
      } else {
        const response = await iterativelyRefineUIComponent({
          userPrompt: prompt,
          baseComponentCode: activeSession.jsxCode,
          existingCss: activeSession.cssCode,
          imageDataUri: userMessage.imageUrl || undefined,
        });
        const { refinedComponentCode, refinedCss } = response;
        const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: `I've updated the component based on your request.` };
        updateActiveSession(s => {
          const newVersion = { jsxCode: refinedComponentCode, cssCode: refinedCss || '' };
          const currentHistory = Array.isArray(s.codeHistory) ? s.codeHistory : [{ jsxCode: s.jsxCode, cssCode: s.cssCode }];
          const currentV = s.currentVersion ?? 0;
          const history = currentHistory.slice(0, currentV + 1);
          const newHistory = [...history, newVersion].slice(-5);
          return {
            chatHistory: [...s.chatHistory, assistantMessage],
            ...newVersion,
            codeHistory: newHistory,
            currentVersion: newHistory.length - 1,
          }
        });
      }

    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = { id: uuidv4(), role: 'system', content: 'An error occurred. Please try again.' };
      updateActiveSession(s => ({ chatHistory: [...s.chatHistory, errorMessage] }));
      toast({
        title: "AI Error",
        description: "Could not process request. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setSelectedCode(null);
    }
  };

  const handleUndo = () => {
    if (!activeSession || !activeSession.codeHistory || activeSession.currentVersion <= 0) return;
    const newVersionIndex = activeSession.currentVersion - 1;
    const newVersion = activeSession.codeHistory[newVersionIndex];
    updateActiveSession({
        ...newVersion,
        currentVersion: newVersionIndex,
    });
  };

  const handleRedo = () => {
    if (!activeSession || !activeSession.codeHistory || activeSession.currentVersion >= activeSession.codeHistory.length - 1) return;
    const newVersionIndex = activeSession.currentVersion + 1;
    const newVersion = activeSession.codeHistory[newVersionIndex];
    updateActiveSession({
        ...newVersion,
        currentVersion: newVersionIndex,
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateActiveSession({ uploadedImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleCopyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `${type} Copied!`, description: "The code has been copied to your clipboard." });
  };

  const handleDownloadZip = () => {
    if (!activeSession) return;
    const zip = new JSZip();
    zip.file("component.jsx", activeSession.jsxCode);
    zip.file("styles.css", activeSession.cssCode);
    zip.generateAsync({ type: "blob" }).then(content => {
      saveAs(content, "component.zip");
      toast({ title: "Downloaded!", description: "Component files zipped and downloaded." });
    });
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
    LucideIcons,
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
    if (!activeSession?.jsxCode) return 'render(null)';
    let code = activeSession.jsxCode;
    if (code.includes('Your component will appear here')) return 'render(<div data-aether-id="el-1">Your component will appear here.</div>)';
    if (/\brender\s*\(/.test(code)) return code;
    
    let cleanedCode = code.replace(/export default\s+/, '').replace(/;$/, '');
    const componentNameMatch = cleanedCode.match(/(?:function|class|const)\s+([A-Z]\w*)/);
  
    if (componentNameMatch) {
      return `${cleanedCode}\n\nrender(<${componentNameMatch[1]} />);`;
    }
    
    const arrowMatch = cleanedCode.match(/const\s+([A-Z]\w*)\s*=\s*\([^)]*\)\s*=>/);
    if(arrowMatch) {
      return `${cleanedCode}\n\nrender(<${arrowMatch[1]} />);`;
    }
    
    return `render(<div>${cleanedCode}</div>)`;
  }, [activeSession?.jsxCode]);

  const previewRef = useRef<HTMLDivElement>(null);
  
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    let target = e.target as HTMLElement;
    while(target && !target.hasAttribute('data-aether-id')) {
        if (target === previewRef.current) {
            target = null;
            break;
        }
        target = target.parentElement as HTMLElement;
    }
    const selectedId = target ? target.getAttribute('data-aether-id') : null;
    updateActiveSession({ selectedElementId: selectedId });
  }

  useEffect(() => {
      if (!previewRef.current || !activeSession) return;
      const allElements = previewRef.current.querySelectorAll('[data-aether-id]');
      allElements.forEach(el => {
          if (el.getAttribute('data-aether-id') === activeSession.selectedElementId) {
              el.setAttribute('data-aether-id-selected', 'true');
          } else {
              el.removeAttribute('data-aether-id-selected');
          }
      });
  }, [activeSession, activeSession?.selectedElementId]);


  if (!isClient || !activeSession) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader className="animate-spin" /></div>;
  }

  const toggleLeftPanel = () => panelGroupRef.current?.getPanel(0)?.isCollapsed() ? panelGroupRef.current?.getPanel(0).expand() : panelGroupRef.current?.getPanel(0).collapse();
  const toggleRightPanel = () => panelGroupRef.current?.getPanel(2)?.isCollapsed() ? panelGroupRef.current?.getPanel(2).expand() : panelGroupRef.current?.getPanel(2).collapse();
  
  const canUndo = activeSession && activeSession.codeHistory && activeSession.currentVersion > 0;
  const canRedo = activeSession && activeSession.codeHistory && activeSession.currentVersion < activeSession.codeHistory.length - 1;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onMouseUp(() => {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
            const model = editor.getModel();
            if (model) {
                const selectedText = model.getValueInRange(selection);
                const language = model.getLanguageId();
                setSelectedCode({
                    code: selectedText,
                    type: language === 'css' ? 'css' : 'jsx'
                });
            }
        } else {
            setSelectedCode(null);
        }
    });
  };

  const handleAskAboutCode = () => {
    if (!selectedCode) return;
    const formattedCode = "```" + selectedCode.type + "\n" + selectedCode.code + "\n```\n";
    setPrompt(p => formattedCode + p);
    setSelectedCode(null);
  }

  return (
    <div className="h-screen w-full bg-background font-body text-foreground">
      <PanelGroup direction="horizontal" ref={panelGroupRef}>
        <Panel
          id="left-panel"
          defaultSize={25}
          minSize={20}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsLeftPanelCollapsed(true)}
          onExpand={() => setIsLeftPanelCollapsed(false)}
          className="flex-shrink-0 !overflow-visible" 
        >
          <aside className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between gap-3 mb-4">
                 <Link href="/" className="flex items-center gap-3">
                    <AetherLogo className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold font-headline">Aether UI</h1>
                 </Link>
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
                      <Avatar className="w-8 h-8"><AvatarFallback>{msg.role === 'assistant' ? <Bot /> : 'S'}</AvatarFallback></Avatar>
                    )}
                    <div className={`rounded-lg px-4 py-2 max-w-[80%] text-sm ${ msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted' } ${msg.role === 'system' ? 'w-full text-center bg-transparent text-muted-foreground text-xs italic' : ''}`}>
                      {msg.imageUrl && (
                        <Image src={msg.imageUrl} alt="Uploaded content" width={200} height={200} className="rounded-md mb-2" />
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <Avatar className="w-8 h-8"><AvatarFallback><User /></AvatarFallback></Avatar>
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
               {activeSession.uploadedImage && (
                  <div className="relative mb-2">
                    <Image src={activeSession.uploadedImage} alt="Uploaded preview" width={100} height={100} className="rounded-md object-cover w-full h-auto max-h-48" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => updateActiveSession({ uploadedImage: null })}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              <form onSubmit={handlePromptSubmit} className="flex gap-2">
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe the component you want..."
                  disabled={isLoading}
                  className="min-h-0"
                  rows={prompt.split('\n').length}
                />
                <div className="flex flex-col gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading} aria-label="Upload Image">
                      <Paperclip />
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    <Button type="submit" disabled={isLoading || !prompt.trim()} size="icon" aria-label="Send"><ChevronRight /></Button>
                </div>
              </form>
               <Button variant="link" className="p-0 h-auto mt-2 text-xs" onClick={() => !isLoading && setPrompt(defaultInitialPrompt)}>
                 Try an example: A modern login form
               </Button>
            </div>
          </aside>
        </Panel>
        
        <PanelResizeHandle className="w-2 bg-border hover:bg-primary transition-colors" />

        <Panel id="main-panel" defaultSize={75}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={60} minSize={20}>
              <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto h-full">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleLeftPanel}>
                    {isLeftPanelCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                  </Button>
                  <h2 className="text-lg font-semibold tracking-tight">Live Preview</h2>
                  <div className="flex-grow" />
                  <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo}><Undo2 /></Button>
                      <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo}><Redo2 /></Button>
                  </div>
                   <div className="flex items-center gap-2">
                      <Button variant={viewportMode === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewportMode('desktop')}>
                        <Monitor />
                      </Button>
                      <Button variant={viewportMode === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewportMode('mobile')}>
                        <Smartphone />
                      </Button>
                    </div>
                  <div className="flex-grow" />
                  <Button variant="ghost" size="icon" onClick={toggleRightPanel}>
                    {isRightPanelCollapsed ? <PanelRightOpen /> : <PanelRightClose />}
                  </Button>
                </div>
                <Card className="flex-1 w-full shadow-lg relative flex items-center justify-center p-4 bg-muted/20" onClick={handlePreviewClick} ref={previewRef}>
                    <style>{activeSession.cssCode}</style>
                    <LiveProvider code={preparedCode} scope={liveProviderScope} noInline={true}>
                        <div className={`relative bg-background shadow-2xl rounded-lg transition-all duration-300 ease-in-out overflow-auto ${viewportMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`}>
                            <div className="w-full h-full">
                                <LivePreview className="w-full h-full flex items-center justify-center p-4" />
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-red-900 text-white p-2 font-mono text-xs">
                            <LiveError />
                        </div>
                    </LiveProvider>
                </Card>
              </main>
            </Panel>

            <PanelResizeHandle className="h-2 bg-border hover:bg-primary transition-colors" />

            <Panel id="bottom-panel" defaultSize={40} minSize={20} collapsible collapsedSize={0} onCollapse={() => setIsRightPanelCollapsed(true)} onExpand={() => setIsRightPanelCollapsed(false)}>
              <aside className="h-full flex-shrink-0 bg-card flex flex-col overflow-hidden relative">
                 {selectedCode && (
                    <div className="absolute top-14 right-8 z-10">
                        <Button onClick={handleAskAboutCode}>
                            <MessageSquareQuote className="mr-2" /> Ask AI about selection
                        </Button>
                    </div>
                 )}
                <Tabs defaultValue="jsx" className="flex-1 flex flex-col">
                  <div className="flex-shrink-0 px-4 pt-4 flex justify-between items-center">
                    <TabsList>
                      <TabsTrigger value="jsx" onClick={() => setSelectedCode(null)}>JSX</TabsTrigger>
                      <TabsTrigger value="css" onClick={() => setSelectedCode(null)}>CSS</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleCopyCode(activeSession.jsxCode, 'JSX')} aria-label="Copy JSX"><Clipboard /></Button>
                      <Button variant="ghost" size="icon" onClick={handleDownloadZip} aria-label="Download Code"><Download /></Button>
                    </div>
                  </div>
                  
                  <TabsContent value="jsx" className="flex-1 m-0 overflow-y-auto">
                    <Editor
                      height="100%"
                      language="javascript"
                      theme="vs-dark"
                      value={activeSession.jsxCode}
                      onChange={(value) => {
                        updateActiveSession({ jsxCode: value || '' });
                        setSelectedCode(null);
                      }}
                      onMount={handleEditorDidMount}
                      options={{ minimap: { enabled: false }, scrollbar: { vertical: 'auto' } }}
                    />
                  </TabsContent>
                  <TabsContent value="css" className="flex-1 m-0 overflow-y-auto">
                    <Editor
                      height="100%"
                      language="css"
                      theme="vs-dark"
                      value={activeSession.cssCode}
                      onChange={(value) => {
                        updateActiveSession({ cssCode: value || '' });
                        setSelectedCode(null);
                      }}
                       onMount={handleEditorDidMount}
                      options={{ minimap: { enabled: false }, scrollbar: { vertical: 'auto' } }}
                    />
                  </TabsContent>
                </Tabs>
              </aside>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
