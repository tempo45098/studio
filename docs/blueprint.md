# **App Name**: Aether UI

## Core Features:

- Session Loading: Load previous sessions, including chat transcript, generated code, and UI editor state.
- New Session: Option to create a new, empty session.
- Conversational UI: Side-panel chat interface for submitting text and image prompts. Responses render live as component code in a central viewport.
- Code Inspection & Export: Display generated JSX/TSX and CSS code with syntax highlighting and 'Copy' / 'Download (.zip)' buttons.
- Iterative Refinement: Iteratively refine components based on follow-up prompts. The AI applies changes and re-renders the component. The AI acts as a tool to achieve iterative refinement of a design component
- Statefulness & Resume: Auto-save sessions to local storage after each chat turn or UI change. Users return to the exact same state upon reload.
- Interactive Property Editor: Floating panel for interactive property editing (size, color, text content, etc.) with two-way binding to JSX/TSX + CSS.

## Style Guidelines:

- Primary color: A saturated purple (#9400D3) to convey sophistication and creativity.
- Background color: A light, desaturated purple (#F0E6F7) to maintain focus on the components.
- Accent color: A vibrant blue-violet (#483D8B) used sparingly for interactive elements and highlights.
- Font: 'Space Grotesk' (sans-serif) for a techy, scientific feel. Used for both headlines and body text.
- Code font: 'Source Code Pro' (monospace) for displaying code snippets.
- Clean and structured layout with a clear division between the chat interface, live preview, and code editor.
- Subtle transitions and animations to provide feedback during interactions.