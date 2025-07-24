'use server';
/**
 * @fileOverview An AI agent to iteratively refine a generated UI component using follow-up prompts.
 *
 * - iterativelyRefineUIComponent - A function that handles the iterative refinement process.
 * - IterativelyRefineUIComponentInput - The input type for the iterativelyRefineUIComponent function.
 * - IterativelyRefineUIComponentOutput - The return type for the iterativelyRefineUIComponent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IterativelyRefineUIComponentInputSchema = z.object({
  baseComponentCode: z
    .string()
    .describe('The base JSX/TSX code of the UI component to be refined.'),
  userPrompt: z.string().describe('The user prompt providing feedback or instructions for refinement.'),
  existingCss: z.string().optional().describe('The existing CSS code for the UI component.'),
});
export type IterativelyRefineUIComponentInput = z.infer<typeof IterativelyRefineUIComponentInputSchema>;

const IterativelyRefineUIComponentOutputSchema = z.object({
  refinedComponentCode: z.string().describe('The refined JSX/TSX code of the UI component.'),
  refinedCss: z.string().optional().describe('The refined CSS code for the UI component.'),
});
export type IterativelyRefineUIComponentOutput = z.infer<typeof IterativelyRefineUIComponentOutputSchema>;

export async function iterativelyRefineUIComponent(input: IterativelyRefineUIComponentInput): Promise<IterativelyRefineUIComponentOutput> {
  return iterativelyRefineUIComponentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'iterativelyRefineUIComponentPrompt',
  input: {schema: IterativelyRefineUIComponentInputSchema},
  output: {schema: IterativelyRefineUIComponentOutputSchema},
  prompt: `You are an AI code assistant specializing in refining UI components. The user will provide you with the existing code of a UI component, along with a prompt describing the desired changes or refinements. Your task is to modify the code according to the user's instructions and return the refined code.

The user is using React with TypeScript, and has access to TailwindCSS and the lucide-react icon library.

Your generated component should be a single default exported function or const.
Do NOT include any other named exports.
Do NOT include \`import React from 'react'\` or any other imports, as they are provided automatically.


Here is the existing code of the UI component:
\`\`\`tsx
{{{baseComponentCode}}}
\`\`\`

Here is the existing CSS code of the UI component (if any):
\`\`\`css
{{{existingCss}}}
\`\`\`

Here is the user's prompt for refinement:
{{{userPrompt}}}

Based on the above information, generate the refined JSX/TSX code and CSS (if needed) for the UI component. Ensure that the refined code is syntactically correct and follows best practices. Return the complete, updated component code. If CSS code was provided, and the user request requires changes to the CSS, update the CSS as well. Preserve the original CSS if it's not necessary to change it. If no CSS code was provided, but the user request needs CSS code, add the CSS code.

Refined JSX/TSX Code:
\`\`\`tsx
{{refinedComponentCode}}
\`\`\`

Refined CSS Code (if needed):
\`\`\`css
{{refinedCss}}
\`\`\`
`,
});

const iterativelyRefineUIComponentFlow = ai.defineFlow(
  {
    name: 'iterativelyRefineUIComponentFlow',
    inputSchema: IterativelyRefineUIComponentInputSchema,
    outputSchema: IterativelyRefineUIComponentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
