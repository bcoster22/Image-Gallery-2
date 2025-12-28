from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import time
import json
from backend_server.monitoring import model_memory_tracker

router = APIRouter()

async def _sse_chat_generator(raw_generator, model):
    yield f"data: {json.dumps({'id': f'chatcmpl-{int(time.time())}', 'object': 'chat.completion.chunk', 'created': int(time.time()), 'model': model, 'choices': [{'index': 0, 'delta': {'role': 'assistant', 'content': ''}, 'finish_reason': None}]})}\\n\\n"
    
    for token in raw_generator:
        chunk = {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": model,
            "choices": [{"index": 0, "delta": {"content": token}, "finish_reason": None}]
        }
        yield f"data: {json.dumps(chunk)}\\n\\n"
        
    yield "data: [DONE]\\n\\n"

@router.post("/v1/chat/completions")
async def chat_completions(request: Request):
    try:
        state = request.app.state
        body = await request.json()
        requested_model = body.get("model")
        messages = body.get("messages", [])
        stream = body.get("stream", False)
        
        intercept_models = ['florence-2-large-4bit', 'wd-vit-tagger-v3']
        if requested_model in intercept_models:
            image_url = None
            prompt_text = ""
            for msg in messages:
                if msg.get("role") == "user":
                    content = msg.get("content")
                    if isinstance(content, list):
                        for item in content:
                            if item.get("type") == "image_url":
                                image_url = item.get("image_url", {}).get("url")
                            elif item.get("type") == "text":
                                prompt_text += item.get("text", "")
            
            if not image_url: raise HTTPException(status_code=400, detail="Image required")
            
            if state.sdxl_backend:
                try: state.sdxl_backend.unload_backend()
                except: pass
            
            if state.advanced_service.start(requested_model):
                answer = state.advanced_service.run(requested_model, prompt_text, image_url)
                return {
                    "id": f"chatcmpl-{int(time.time())}",
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": requested_model,
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": answer}, "finish_reason": "stop"}]
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to load {requested_model}")

        # Standard Logic
        model = requested_model if requested_model else "moondream-2"

        if not messages:
            raise HTTPException(status_code=400, detail="Messages required")

        # Extract last user message
        last_user_msg = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_msg = msg
                break
        if not last_user_msg:
            raise HTTPException(status_code=400, detail="No user message found")

        content = last_user_msg.get("content", "")
        prompt_text = ""
        image_url = None
        if isinstance(content, str): prompt_text = content
        elif isinstance(content, list):
            for item in content:
                if item.get("type") == "text": prompt_text += item.get("text", "")
                elif item.get("type") == "image_url": image_url = item.get("image_url", {}).get("url")

        function_name = "caption"
        kwargs = {"stream": stream}
        if image_url:
            kwargs["image_url"] = image_url
            if prompt_text and prompt_text.lower().strip() not in ["describe this", "caption this", ""]:
                function_name = "query"
                kwargs["question"] = prompt_text
        else:
            raise HTTPException(status_code=400, detail="Image required for Moondream")

        # Smart VRAM Management
        vram_mode = request.headers.get("X-VRAM-Mode", "balanced")
        if vram_mode in ["balanced", "low"]:
                if state.sdxl_backend:
                    try: state.sdxl_backend.unload_backend()
                    except: pass

        # Ensure service running
        if not state.inference_service.is_running():
            if state.inference_service.start(model):
                state.config.set("current_model", model)
                try: model_memory_tracker.track_model_load(model, model)
                except: pass
        
        # Switch if needed
        current = state.config.get("current_model")
        if model and model != current:
            if state.inference_service.start(model):
                    state.config.set("current_model", model)

        # Execute
        try:
            result = await state.inference_service.execute_function(function_name, None, **kwargs)
        except Exception as e:
            # OOM Retry
            if "out of memory" in str(e).lower():
                # Unload logic need to be accessible ideally via function or duplicated
                if state.inference_service: state.inference_service.unload_model()
                try: state.sdxl_backend.unload_backend()
                except: pass
                model_memory_tracker.loaded_models.clear()
                
                if state.inference_service.start(model):
                    result = await state.inference_service.execute_function(function_name, None, **kwargs)
                else: raise
            else: raise

        if stream:
            return StreamingResponse(
                _sse_chat_generator(result, model), 
                media_type="text/event-stream"
            )

        # Standard Response
        response_text = ""
        if isinstance(result, dict):
            response_text = result.get("caption") or result.get("answer") or json.dumps(result)
        else:
            response_text = str(result)

        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": response_text}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 0, "completion_tokens": len(response_text.split()), "total_tokens": 0}
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
