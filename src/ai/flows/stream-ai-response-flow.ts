'use server';
/**
 * @fileOverview A Genkit flow to stream AI responses from a llama.cpp API endpoint.
 *
 * - streamAiResponse - A function that handles sending a prompt to llama.cpp and returns the streaming response.
 * - StreamAiResponseInput - The input type for the streamAiResponse function.
 * - StreamAiResponseOutput - The return type for the streamAiResponse function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { llamaCppModel } from '@/ai/models/llama-cpp-model';

// Define the input schema for the flow
const StreamAiResponseInputSchema = z.object({
  prompt: z.string().describe('The user\'s message to the AI.'),
});
export type StreamAiResponseInput = z.infer<typeof StreamAiResponseInputSchema>;

// Define the output schema for the flow (final aggregated text)
const StreamAiResponseOutputSchema = z.string().describe('The AI\'s full response text.');
export type StreamAiResponseOutput = z.infer<typeof StreamAiResponseOutputSchema>;

// Wrapper function to call the Genkit flow
export async function streamAiResponse(input: StreamAiResponseInput): Promise<StreamAiResponseOutput> {
  return streamAiResponseFlow(input);
}

// Define the Genkit flow
const streamAiResponseFlow = ai.defineFlow(
  {
    name: 'streamAiResponseFlow',
    inputSchema: StreamAiResponseInputSchema,
    outputSchema: StreamAiResponseOutputSchema,
  },
  async (input) => {
    // Call the custom llama.cpp model for streaming generation.
    // The client calling this flow via ai.runFlow will receive stream chunks
    // as they are yielded by the custom model's generateStream implementation.
    // The 'response' promise resolves with the final aggregated output once the stream completes.
    const { response } = await ai.generateStream({
      model: llamaCppModel,
      prompt: input.prompt,
      // Optional: Pass configuration to the model if needed, e.g.,
      // config: { temperature: 0.8, max_tokens: 100 }
    });

    // Await the full response from the model and return its text output.
    // Genkit internally aggregates the chunks from the stream into response.output.text.
    const finalOutput = (await response).output?.text;

    if (!finalOutput) {
      throw new Error('Llama.cpp model did not return any text output.');
    }

    return finalOutput;
  }
);
