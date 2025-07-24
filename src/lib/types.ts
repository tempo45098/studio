export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    imageUrl?: string | null;
  }

  export interface CodeVersion {
    jsxCode: string;
    cssCode: string;
  }
  
  export interface Session {
    id:string;
    name: string;
    createdAt: string;
    chatHistory: Message[];
    jsxCode: string;
    cssCode: string;
    uploadedImage: string | null;
    codeHistory: CodeVersion[];
    currentVersion: number;
    selectedElementId: string | null;
  }
  