# 🤖 EventSphere Chatbot — Training & Deployment Guide

A fine-tuned local LLM chatbot for the EventSphere platform, trained using the same pipeline as Igris-Training.

```
generate_data.js → dataset.jsonl → Unsloth fine-tune (Colab) → GGUF → Ollama → Express API → React Widget
```

---

## 📁 Files in this folder

| File | Purpose |
|------|---------|
| `generate_data.js` | Generates thousands of training examples from intent templates |
| `train_eventsphere.py` | Unsloth LoRA fine-tune script (paste into Google Colab) |
| `Modelfile` | Ollama model definition with system prompt & inference params |
| `README.md` | This file — complete setup instructions |

**After training, you'll also have:**
| File | Purpose |
|------|---------|
| `dataset.jsonl` | Generated training data (created by `generate_data.js`) |
| `eventsphere-chat-q4_k_m.gguf` | Trained model weights (downloaded from Colab) |

---

## 🚀 Complete Step-by-Step Guide

### Step 1: Generate the Training Dataset

Run the data generator on your local machine:

```bash
cd chatbot
node generate_data.js
```

**What it does:**
- Creates `dataset.jsonl` with thousands of training examples
- 39 intent categories covering all EventSphere features
- Multiple prompt variations per intent (original, capitalized, polite, question, prefixed)
- Randomized response prefixes for variety
- 10x multiplier for robust training

**Expected output:**
```
🚀 EventSphere Chatbot Dataset Generated!
   Total training examples: ~15,000+
   Intent categories: 39+
   Output: dataset.jsonl (~X MB)
```

---

### Step 2: Fine-Tune on Google Colab (Free Tier)

#### Prerequisites
- A Google account (for Colab)
- The `dataset.jsonl` file from Step 1

#### Instructions

1. **Open Google Colab**: Go to [colab.research.google.com](https://colab.research.google.com)

2. **Set GPU Runtime**:
   - Click `Runtime` → `Change runtime type`
   - Select **T4 GPU** (available on free tier)
   - Click `Save`

3. **Upload dataset.jsonl**:
   - Click the 📁 folder icon in the left sidebar
   - Click the upload button (⬆️)
   - Upload your `dataset.jsonl` file

4. **Paste the training script**:
   - Create a new code cell
   - Copy-paste the ENTIRE contents of `train_eventsphere.py` into the cell

5. **Run the cell**:
   - Click the ▶️ play button or press `Shift + Enter`
   - The script will:
     - Install Unsloth and dependencies (~2-3 min)
     - Load Qwen2.5-3B-Instruct base model (~1-2 min)
     - Tokenize the dataset (~1 min)
     - Train for 300 steps (~20-30 min on T4)
     - Export as GGUF (~5 min)

6. **Download the GGUF file**:
   - After training completes, find `eventsphere-chat-q4_k_m.gguf` in the left file panel
   - Right-click → **Download**
   - Save it to this `chatbot/` folder

**Total time: ~30-40 minutes on free Colab T4**

#### Base Model Info

| Property | Value |
|----------|-------|
| **Model** | Qwen2.5-3B-Instruct |
| **Parameters** | 3 billion |
| **Quantization** | Q4_K_M (4-bit) |
| **VRAM Required** | ~6-8 GB (fits T4's 15GB easily) |
| **Final GGUF Size** | ~2 GB |
| **Why Qwen2.5?** | Best quality-to-size ratio, excellent instruction following |
| **Alternative** | `unsloth/Llama-3.2-3B-Instruct` (change `MODEL_NAME` in script) |

#### Training Config

| Parameter | Value | Explanation |
|-----------|-------|-------------|
| LoRA rank (r) | 16 | Balance of quality and speed |
| LoRA alpha | 32 | Stronger fine-tuning signal |
| Batch size | 2 | Fits T4 memory |
| Gradient accumulation | 4 | Effective batch = 8 |
| Max steps | 300 | Sufficient for persona absorption |
| Learning rate | 2e-4 | Standard for LoRA |
| Scheduler | Cosine | Smooth learning rate decay |

---

### Step 3: Deploy to Ollama

#### Prerequisites
- [Ollama](https://ollama.ai) installed on your machine
- The downloaded `.gguf` file in this `chatbot/` folder

#### Instructions

1. **Verify Ollama is installed**:
   ```bash
   ollama --version
   ```

2. **Place the GGUF file** in this `chatbot/` folder:
   ```
   chatbot/
   ├── Modelfile
   ├── eventsphere-chat-q4_k_m.gguf   ← downloaded from Colab
   └── ...
   ```

3. **Create the Ollama model**:
   ```bash
   cd chatbot
   ollama create eventsphere-chat -f Modelfile
   ```

4. **Test the model**:
   ```bash
   ollama run eventsphere-chat
   ```
   Then type: `how do I register for an event?`

5. **Verify it's listed**:
   ```bash
   ollama list
   ```
   You should see `eventsphere-chat` in the output.

#### Ollama API Test

Once the model is running, test the API directly:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "eventsphere-chat",
  "messages": [{"role": "user", "content": "how do I register for an event?"}],
  "stream": false
}'
```

---

### Step 4: Integrate with EventSphere

After the model is deployed to Ollama, you need to:

1. **Create the backend route** — `backend/src/routes/chatbot.js`
   - Express route that calls Ollama API at `http://localhost:11434/api/chat`
   - Public endpoint (no authentication)
   - Sends conversation history for context

2. **Mount the route** — Add to `backend/src/server.js`:
   ```javascript
   const chatbotRoutes = require('./routes/chatbot');
   app.use('/api/chatbot', chatbotRoutes);
   ```

3. **Create the React widget** — `src/components/ChatBot.jsx`
   - Floating chat bubble in bottom-right corner
   - Chat window with message history
   - Calls `POST /api/chatbot` endpoint

4. **Mount the widget** — Add to `src/App.jsx`:
   ```jsx
   import ChatBot from './components/ChatBot';
   // Inside <Router>:
   <ChatBot />
   ```

---

## 🧠 Intent Categories

The chatbot is trained on these EventSphere-specific topics:

| # | Intent | Coverage |
|---|--------|----------|
| 1 | Greetings | hi, hello, hey, good morning, etc. |
| 2 | What is EventSphere | Platform explanation |
| 3 | How to Register | Step-by-step registration guide |
| 4 | Ticket Tiers | VIP, General, Early Bird explanation |
| 5 | Free Events | No-payment registration |
| 6 | How to Pay | UPI payment process |
| 7 | Payment Screenshot | Upload requirements |
| 8 | Payment Pending | Verification wait time |
| 9 | Payment Declined | What to do when declined |
| 10 | Refunds | 3-7 business days policy |
| 11 | Confirmation Email | Finding & troubleshooting |
| 12 | Pass ID | Unique ticket identifier |
| 13 | QR Code & Entry | Venue scanning process |
| 14 | Ticket Status | OUTSIDE/INSIDE/PENDING/DECLINED |
| 15 | Event Details | Date, time, venue info |
| 16 | Custom Form Fields | Organizer-added fields |
| 17 | Capacity / Sold Out | Slot availability |
| 18 | Change/Upgrade Tier | Tier modification policy |
| 19 | Contact Organizer | How to reach event team |
| 20 | Email Issues | Spam folder, missing emails |
| 21 | Mobile Support | Responsive design |
| 22 | Data Privacy | Security & data handling |
| 23 | Multiple Events | Registering for multiple |
| 24 | Cancel Registration | Cancellation process |
| 25 | Browse Events | Landing page navigation |
| 26 | Resend Email | Getting confirmation resent |
| 27 | UPI QR Code | Payment QR location |
| 28 | After Registration | Next steps post-signup |
| 29 | Event Not Found | Broken links, errors |
| 30 | Technical Issues | Troubleshooting steps |
| 31 | Already Registered | Duplicate handling |
| 32 | Attendance/Check-in | Venue check-in system |
| 33 | Goodbyes | Thank you, bye |
| 34 | Off-Topic | Redirect to EventSphere |
| 35 | Scanner App | Staff scanning tool |
| 36 | General Help | What the bot can do |
| 37 | Who Built This | Platform credits |
| 38 | Group Registration | Team/bulk signup |
| 39 | Event Day Tips | Day-of checklist |

---

## 🔧 Troubleshooting

### Colab Issues

| Problem | Solution |
|---------|----------|
| "No GPU detected" | Runtime → Change runtime type → T4 GPU |
| Out of memory | Restart runtime, then run again |
| "Module not found" | Re-run the install cell |
| GGUF export fails | Download raw weights from `eventsphere_final_weights/` and convert locally |
| Session disconnected | Re-upload dataset.jsonl and run again (training restarts) |

### Ollama Issues

| Problem | Solution |
|---------|----------|
| `ollama create` fails | Check the .gguf filename matches the `FROM` line in Modelfile |
| Model gives gibberish | Increase `max_steps` to 500 and retrain |
| Slow responses | Normal for 3B model on CPU; GPU inference is faster |
| "Model not found" | Run `ollama list` to check model name |

---

## 📊 Customizing the Dataset

To add new intents or modify responses:

1. Edit `generate_data.js`
2. Add new template objects to the `templates` array
3. Re-run `node generate_data.js`
4. Re-upload `dataset.jsonl` to Colab and retrain

**Template format:**
```javascript
{
  prompts: ["user query 1", "user query 2", "user query 3"],
  assistant: () => `${getPrefix()}Your response here...`
}
```
