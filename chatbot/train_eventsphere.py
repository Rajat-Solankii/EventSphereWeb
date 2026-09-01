"""
EventSphere Chatbot — Unsloth Fine-Tuning Script (Google Colab Free Tier)
--------------------------------------------------------------------------
Base Model: Qwen2.5-3B-Instruct (best quality-to-size ratio, fits T4 easily)
Alternative: unsloth/Llama-3.2-3B-Instruct (if Qwen has issues)

STEP 1: Runtime -> Change Runtime Type -> T4 GPU
STEP 2: Upload 'dataset.jsonl' to the Colab file panel (left sidebar folder icon)
STEP 3: Paste ALL this code into ONE cell and click Run.
"""

# ===== Install Unsloth =====
import subprocess, sys

print("Installing Unsloth and dependencies...")
subprocess.run([sys.executable, "-m", "pip", "install", "unsloth", "-q"], check=False)
subprocess.run([sys.executable, "-m", "pip", "install",
    "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git", "-q"], check=False)
subprocess.run([sys.executable, "-m", "pip", "install", "--no-deps",
    "xformers<0.0.27", "trl<0.9.0", "peft", "accelerate", "bitsandbytes", "-q"], check=False)
print("Install done.")

# ===== Clear memory =====
import gc, torch

gc.collect()
if torch.cuda.is_available():
    torch.cuda.empty_cache()
    total_vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"GPU: {torch.cuda.get_device_name(0)} | VRAM: {total_vram:.1f} GB")
else:
    print("No GPU detected! Make sure you selected T4 GPU in Runtime settings.")

# ===== Load Qwen2.5-3B-Instruct =====
from unsloth import FastLanguageModel

max_seq_length = 2048
dtype = None
load_in_4bit = True

# Qwen2.5-3B-Instruct — excellent instruction following, multilingual, fits T4
# If this doesn't work, swap to: "unsloth/Llama-3.2-3B-Instruct"
MODEL_NAME = "unsloth/Qwen2.5-3B-Instruct"

print(f"Loading {MODEL_NAME}...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = MODEL_NAME,
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)
print("Model loaded.")

model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj"],
    lora_alpha = 32,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
)

# ===== Load dataset =====
from datasets import load_dataset
import os

dataset_path = "dataset.jsonl"
if not os.path.exists(dataset_path):
    for root, dirs, files in os.walk("/content"):
        for f in files:
            if f == "dataset.jsonl":
                dataset_path = os.path.join(root, f)
                break

print(f"Loading dataset from: {dataset_path}")
dataset = load_dataset("json", data_files=dataset_path, split="train")
print(f"Loaded {len(dataset)} training examples.")

def format_chat_template(row):
    messages = row["messages"]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    return {"text": text}

print("Tokenizing (single-threaded to prevent RAM crash)...")
dataset = dataset.map(format_chat_template, num_proc=1, desc="Formatting")

gc.collect()
torch.cuda.empty_cache()
print("Tokenization complete.")

# ===== Train =====
from trl import SFTTrainer
from transformers import TrainingArguments

print("Starting training...")
trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 1,
    packing = True,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,   # Effective batch = 8
        warmup_steps = 10,
        max_steps = 300,                   # Enough for persona absorption
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 10,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "cosine",
        seed = 3407,
        output_dir = "outputs",
        save_strategy = "no",
        dataloader_pin_memory = False,
        report_to = "none",
    ),
)

trainer_stats = trainer.train()
print(f"Training complete! Loss: {trainer_stats.training_loss:.4f}")

# ===== Export GGUF =====
gc.collect()
torch.cuda.empty_cache()

print("Exporting GGUF for Ollama...")
model.save_pretrained("eventsphere_lora_model")
tokenizer.save_pretrained("eventsphere_lora_model")

try:
    model.save_pretrained_gguf("eventsphere-chat-q4_k_m", tokenizer, quantization_method="q4_k_m")
    print("\n✅ SUCCESS! Download 'eventsphere-chat-q4_k_m.gguf' from the left file panel!")
    print("Right-click the .gguf file in the left sidebar and click Download.")
    print("\nNext steps:")
    print("  1. Place the .gguf file in the chatbot/ folder")
    print("  2. Run: ollama create eventsphere-chat -f Modelfile")
    print("  3. Test: ollama run eventsphere-chat")
except Exception as e:
    print(f"GGUF export failed: {e}")
    model.save_pretrained("eventsphere_final_weights")
    tokenizer.save_pretrained("eventsphere_final_weights")
    print("Saved raw weights to 'eventsphere_final_weights' folder instead.")
    print("You can convert to GGUF manually using llama.cpp.")
