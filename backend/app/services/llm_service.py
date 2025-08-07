import asyncio
from typing import List, Dict, Any, AsyncGenerator
from anthropic import AsyncAnthropic
from app.core.config import settings


class LLMService:
    def __init__(self):
        # Only use Claude - no OpenAI dependency
        if not settings.CLAUDE_API_KEY:
            raise ValueError("CLAUDE_API_KEY is required for LLM responses")
        
        self.claude_client = AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)
        self.primary_llm = "claude"
    
    def build_rag_prompt(self, question: str, context_chunks: List[Dict[str, Any]]) -> str:
        """
        Build a prompt for RAG with context chunks.
        """
        context_text = "\n\n".join([
            f"[Context {i+1}]:\n{chunk['content']}"
            for i, chunk in enumerate(context_chunks)
        ])
        
        prompt = f"""You are a helpful AI assistant that answers questions based on provided document context. 

Use the following context to answer the user's question. If the answer cannot be found in the context, say so clearly.

Context:
{context_text}

Question: {question}

Answer: Please provide a comprehensive answer based on the context above. If you reference specific information, indicate which context section it comes from."""

        return prompt
    
    async def generate_response(
        self, 
        prompt: str, 
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Generate response using Claude with streaming support.
        """
        try:
            async for chunk in self._generate_claude_response(prompt, stream):
                yield chunk
                
        except Exception as e:
            yield f"Error generating response: {str(e)}"
    
    async def _generate_claude_response(
        self, 
        prompt: str, 
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """Generate response using Claude."""
        try:
            if stream:
                async with self.claude_client.messages.stream(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
            else:
                response = await self.claude_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
                yield response.content[0].text
                
        except Exception as e:
            yield f"Claude API Error: {str(e)}"
    

    
    async def generate_chat_title(self, first_message: str) -> str:
        """
        Generate a short title for a chat session based on the first message.
        """
        prompt = f"""Generate a short, descriptive title (max 6 words) for a chat session that starts with this question:

"{first_message}"

Title:"""
        
        try:
            title = ""
            async for chunk in self.generate_response(prompt, stream=False):
                title += chunk
            
            # Clean up the title
            title = title.strip().replace('"', '').replace('\n', ' ')
            if len(title) > 50:
                title = title[:47] + "..."
            
            return title or "Document Chat"
            
        except Exception:
            return "Document Chat"
