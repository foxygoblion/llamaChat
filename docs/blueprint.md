# **App Name**: LlamaChat AI

## Core Features:

- User Message Input: An interactive input field allowing users to type and send chat messages to the AI.
- Real-time AI Response Display: Dynamically concatenate and display the AI's streaming responses in real-time as they are received from the llama.cpp API.
- Chat Message History: Display both user-sent messages and AI-generated responses in a conversational chat interface.
- llama.cpp API Integration: Make POST requests to the local llama.cpp API endpoint at http://100.84.17.115:1234/completion with specified parameters (prompt, temperature, top_p, max_tokens, stream=true). Note: The provided API key 'sk-123456' is noted but not included in the 'curl' example; therefore, it will not be sent as part of the API request for this MVP.
- Conversation Management: Maintain context for ongoing conversations, potentially by sending previous chat turns back to the AI with each new prompt, acting as an AI tool.

## Style Guidelines:

- Dark color scheme for a sophisticated and modern AI interface. Background color: A dark desaturated blue (#1C1E26). Primary UI elements (e.g., send button, active state): A vibrant, tech-inspired blue (#5EA1F7). Accent color for highlights and user messages: A refreshing cyan (#3DD7F4).
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern, objective, and highly readable chat experience.
- Minimalistic and sharp icons suitable for a chat application (e.g., send icon, loading spinner), reinforcing the clean aesthetic.
- A clean, two-column layout: a compact sidebar (optional for future features) and a main chat window. The chat window features clear message bubbles for both user and AI, with ample padding for readability.
- Subtle loading animations for AI responses to indicate processing. Smooth transitions for message sending and receiving to enhance perceived responsiveness.