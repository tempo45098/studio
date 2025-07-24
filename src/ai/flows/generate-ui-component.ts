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
  prompt: `You are a UI component code generation expert. Generate JSX/TSX and CSS code based on the user's prompt. Ensure the code is well-formatted and uses modern styling practices.

Prompt: {{{prompt}}}

Output the JSX/TSX code and CSS code in separate blocks.

JSX/TSX Code:
\`\`\`jsx
{{jsxTsxCode}}
\`\`\`

CSS Code:
\`\`\`css
{{cssCode}}
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
