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
Ensure the code is well-formatted and uses modern styling practices.
You MUST generate CSS for styling. Do NOT use TailwindCSS. All styling should be in the CSS block.
The user is using React with TypeScript and the lucide-react icon library.

Your generated component should be a single default exported function or const.
Do NOT include any other named exports.
Do NOT include \`import React from 'react'\` or any other imports, as they are provided automatically.

Prompt: {{{prompt}}}

Begin your response with the JSX/TSX code, followed by the CSS code.

JSX/TSX Code:
\`\`\`tsx
{{{jsxTsxCode}}}
\`\`\`

CSS Code:
\`\`\`css
{{{cssCode}}}
\`\`\``,
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
