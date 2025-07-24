'use server';

/**
 * @fileOverview A conversational AI flow for asking questions about or refining a snippet of code.
 *
 * - askAiAboutCode - A function that takes a code snippet and a user prompt, and either explains the code or provides a refined version.
 * - AskAiAboutCodeInput - The input type for the askAiAboutCode function.
 * - AskAiAboutCodeOutput - The return type for the askAiAboutCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskAiAboutCodeInputSchema = z.object({
  codeSnippet: z.string().describe('The snippet of code to be discussed.'),
  userPrompt: z.string().describe('The user\'s question or instruction about the code snippet.'),
});
export type AskAiAboutCodeInput = z.infer<typeof AskAiAboutCodeInputSchema>;

const AskAiAboutCodeOutputSchema = z.object({
    responseType: z.enum(['explanation', 'code_update']).describe("The type of response generated. 'explanation' if the AI is explaining code, 'code_update' if it is providing new code."),
    explanation: z.string().optional().describe('The textual explanation of the code, if requested.'),
    updatedCode: z.string().optional().describe('The new or modified code snippet, if the user asked for a change.'),
});
export type AskAiAboutCodeOutput = z.infer<typeof AskAiAboutCodeOutputSchema>;


export async function askAiAboutCode(input: AskAiAboutCodeInput): Promise<AskAiAboutCodeOutput> {
  return askAiAboutCodeFlow(input);
}


const prompt = ai.definePrompt({
  name: 'askAiAboutCodePrompt',
  input: {schema: AskAiAboutCodeInputSchema},
  output: {schema: AskAiAboutCodeOutputSchema},
  prompt: `You are an expert AI code assistant. The user has selected a snippet of code and has a question or request about it.
Your task is to analyze the user's prompt and the code snippet and determine if the user is asking for an explanation or asking for a code modification.

- If the user is asking for an explanation (e.g., "what does this do?", "explain this css"), provide a clear and concise explanation in the 'explanation' field. Set 'responseType' to 'explanation'. Do NOT provide code.
- If the user is asking to modify the code (e.g., "make this button bigger", "change color to blue"), you must provide the complete, updated code snippet in the 'updatedCode' field. Set 'responseType' to 'code_update'. Do NOT provide an explanation.

Code Snippet:
\`\`\`
{{{codeSnippet}}}
\`\`\`

User's Prompt:
"{{{userPrompt}}}"

Analyze the user's prompt and provide the appropriate response based on the rules above.
`,
});

const askAiAboutCodeFlow = ai.defineFlow(
  {
    name: 'askAiAboutCodeFlow',
    inputSchema: AskAiAboutCodeInputSchema,
    outputSchema: AskAiAboutCodeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
