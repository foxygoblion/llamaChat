'use server';
/**
 * @fileOverview This file implements a Genkit flow that allows the AI to maintain context
 * across multiple turns of a conversation. It takes the current user message and
 * a history of previous messages (user and AI) as input, and returns an AI response
 * that is relevant to the ongoing dialogue.
 *
 * - maintainConversationContext - A function that handles generating AI responses with context.
 * - MaintainConversationContextInput - The input type for the maintainConversationContext function.
 * - MaintainConversationContextOutput - The return type for the maintainConversationContext function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MaintainConversationContextInputSchema = z.object({
  message: z.string().describe("The user's current message."),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']).describe('The role of the speaker (user or model).'),
      content: z.string().describe('The content of the message.'),
    })
  ).describe('An array of previous conversation turns between the user and the AI.'),
});
export type MaintainConversationContextInput = z.infer<typeof MaintainConversationContextInputSchema>;

const MaintainConversationContextOutputSchema = z.object({
  response: z.string().describe('The AI\'s response to the user\'s message, maintaining conversation context.'),
});
export type MaintainConversationContextOutput = z.infer<typeof MaintainConversationContextOutputSchema>;

export async function maintainConversationContext(input: MaintainConversationContextInput): Promise<MaintainConversationContextOutput> {
  return maintainConversationContextFlow(input);
}

const maintainConversationContextPrompt = ai.definePrompt({
  name: 'maintainConversationContextPrompt',
  input: { schema: MaintainConversationContextInputSchema },
  output: { schema: MaintainConversationContextOutputSchema },
  prompt: `You are a helpful AI assistant. You will respond to the user's last message, taking into account the full conversation history provided. Your response should be natural, continuous, and relevant to the ongoing dialogue.

Conversation History:
{{#each history}}
{{#ifEquals role "user"}}User: {{content}}
{{else}}AI: {{content}}
{{/ifEquals}}
{{/each}}

User: {{message}}
AI: `,
});

const maintainConversationContextFlow = ai.defineFlow(
  {
    name: 'maintainConversationContextFlow',
    inputSchema: MaintainConversationContextInputSchema,
    outputSchema: MaintainConversationContextOutputSchema,
  },
  async (input) => {
    const { output } = await maintainConversationContextPrompt(input);
    return output!;
  }
);
