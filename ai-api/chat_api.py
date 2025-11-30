from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch
import uvicorn
from typing import List, Optional
import logging

quantization_config = BitsAndBytesConfig(load_in_8bit=True)

model_dir_dict = {
    "deepseek": "./DeepSeek-R1-Distill-Qwen-7B",
    "qwen3": "./Qwen3-8B"
}

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DeepSeek Local API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerationRequest(BaseModel):
    messages: List[dict]
    systemPrompt: Optional[str] = ''
    max_tokens: Optional[int] = 8192
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    stream: Optional[bool] = False
    model: Optional[str] = 'deepseek'

class GenerationResponse(BaseModel):
    choices: List[dict]
    usage: dict

class ModelManager:
    def __init__(self, model_name: str = "deepseek"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def load_model(self):
        """加载模型和tokenizer"""
        try:
            model_path = model_dir_dict[self.model_name]
            logger.info(f"正在加载模型: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_path,
                quantization_config=quantization_config,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                trust_remote_code=True,
                low_cpu_mem_usage=True,
            )
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
                
            logger.info("模型加载完成!")
        except Exception as e:
            logger.error(f"模型加载失败: {e}")
            raise

    def switch_model(self, model_name):
        if model_name in model_dir_dict:
            self.model_name = model_name
            del self.model
            self.load_model()



model_manager = ModelManager()

@app.on_event("startup")
async def startup_event():
    """启动时加载模型"""
    model_manager.load_model()

@app.post("/v1/chat/completions", response_model=GenerationResponse)
async def chat_completion(request: GenerationRequest):
    try:
        # 构建prompt
        if request.model != model_manager.model_name:
            print('request model: {request.model}, current model: {model_manager.model_name}')
            model_manager.switch_model(request.model)
            print("switch to {model_manager.model_name} success!")
        # prompt = ""
        # for message in request.messages:
        #     role = message["role"]
        #     content = message["content"]
        #     prompt += f"{role}: {content}\n"
        # prompt += "assistant: "

         # 编码输入
        # inputs = model_manager.tokenizer(prompt, return_tensors="pt")
        # if model_manager.device == "cuda":
        #     inputs = inputs.to(model_manager.device)

        text = model_manager.tokenizer.apply_chat_template(
            request.messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False
        )
        
        # 生成参数
        generation_config = {
            "max_new_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "do_sample": True,
            "pad_token_id": model_manager.tokenizer.eos_token_id
        }

        model_inputs = model_manager.tokenizer([text], return_tensors="pt").to(model_manager.device)

        # 生成文本
        with torch.no_grad():
            # outputs = model_manager.model.generate(
            #     **inputs,
            #     **generation_config
            # )
            generated_ids = model_manager.model.generate(
                **model_inputs,
                **generation_config
            )

            output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist() 

            # parsing thinking content
            try:
                index = len(output_ids) - output_ids[::-1].index(151668)
            except ValueError:
                index = 0
        
        # # 解码输出
        # generated_text = model_manager.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # response_text = generated_text[len(prompt):]

        # thinking_content = model_manager.tokenizer.decode(output_ids[:index], skip_special_tokens=True).strip("\n")
        content = model_manager.tokenizer.decode(output_ids[index:], skip_special_tokens=True).strip("\n")
        content = content.split('</think>')[1]
        
        return GenerationResponse(
            choices=[{
                "message": {
                    "role": "assistant",
                    "content": content
                },
                "finish_reason": "stop"
            }],
            usage={
                # "prompt_tokens": len(inputs[0]),
                # "completion_tokens": len(outputs[0]) - len(inputs[0]),
                # "total_tokens": len(outputs[0])
            }
        )
        
    except Exception as e:
        logger.error(f"生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model_manager.model is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")