'use server';

/**
 * @fileOverview Flow for generating UI component code from a text prompt.
 *
 * - generateUiComponent - A function that generates JSX/TSX and CSS code for a UI component based on a text prompt.
 * - GenerateUiComponentInput - The input type for the generateUiComponent function.
 * - GenerateUiComponentOutput - The return type for the generateUiComponent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateUiComponentInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired UI component.'),
  imageDataUri: z.string().optional().describe("An optional image providing visual context for the UI component, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateUiComponentInput = z.infer<typeof GenerateUiComponentInputSchema>;

const GenerateUiComponentOutputSchema = z.object({
  jsxTsxCode: z.string().describe('The generated JSX/TSX code for the UI component.'),
  cssCode: z.string().describe('The generated CSS code for the UI component.'),
});
export type GenerateUiComponentOutput = z.infer<typeof GenerateUiComponentOutputSchema>;

export async function generateUiComponent(input: GenerateUiComponentInput): Promise<GenerateUiComponentOutput> {
  return generateUiComponentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUiComponentPrompt',
  input: {schema: GenerateUiComponentInputSchema},
  output: {schema: GenerateUiComponentOutputSchema},
  prompt: `You are a UI component code generation expert. Generate JSX/TSX and standard CSS code based on the user's prompt.
The generated component MUST be responsive and adapt its layout for different screen sizes. Use media queries in your CSS to create distinct looks for mobile and desktop.
You MUST generate CSS for styling. Do NOT use TailwindCSS. All styling should be in the CSS block.
The user is using React with TypeScript. For any icons, use the lucide-react library by referencing them from the \`LucideIcons\` object (e.g., \`<LucideIcons.Mail />\`).
Crucially, you MUST add a unique 'data-aether-id' attribute to EVERY JSX element you generate. This is essential for the editor to identify elements. The ID should be a short, unique string, for example: 'el-1', 'el-2', etc.

Your generated component should be a single default exported function or const.
Do NOT include any other named exports.
Do NOT include \`import React from 'react'\` or any other imports, as they are provided automatically.

Prompt: {{{prompt}}}

{{#if imageDataUri}}
The user has provided an image as a visual reference. Base your component design on this image.
Image: {{media url=imageDataUri}}
{{/if}}
`,
});

const generateUiComponentFlow = ai.defineFlow(
  {
    name: 'generateUiComponentFlow',
    inputSchema: GenerateUiComponentInputSchema,
    outputSchema: GenerateUiComponentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
