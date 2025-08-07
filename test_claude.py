#!/usr/bin/env python3
import asyncio
import sys
sys.path.append('/app')

from app.services.llm_service import LLMService

async def test_claude():
    try:
        print("Testing Claude API...")
        llm = LLMService()
        
        print("Sending test prompt...")
        response_text = ""
        async for chunk in llm.generate_response("Hello! Can you respond with 'Claude is working'?", stream=False):
            response_text += chunk
            print(f"Received: {chunk}")
        
        print(f"Final response: {response_text}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_claude())
