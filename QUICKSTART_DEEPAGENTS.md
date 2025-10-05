# 🚀 Quick Start: DeepAgents Backend

**Get your agentic AI system running in 5 minutes!**

---

## Prerequisites

- ✅ Python 3.9+ installed
- ✅ Node.js installed
- ✅ OpenRouter API key (already in your .env)

---

## Step 1: Setup Python Backend (2 minutes)

```bash
# Navigate to backend directory
cd C:\Users\netfl\OneDrive\Desktop\author\backend

# Run automated setup
python setup.py
```

This creates a virtual environment and installs all dependencies.

---

## Step 2: Configure Environment (30 seconds)

Edit your `.env` file in the project root:

```env
# Your existing OpenRouter config (keep as-is)
CLAUDE_API_KEY=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
CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1
CLAUDE_MODEL=x-ai/grok-4-fast

# Add these two lines:
SUBAGENT_MODEL=alibaba/tongyi-deepresearch-30b-a3b
USE_DEEPAGENTS=true
```

Save and close.

---

## Step 3: Test Backend (30 seconds)

```bash
# From backend directory
.\venv\Scripts\activate
python main.py
```

You should see:
```
╔══════════════════════════════════════════════╗
║          Author Backend Server               ║
║      Powered by DeepAgents & FastAPI         ║
╚══════════════════════════════════════════════╝

Starting server at http://127.0.0.1:8765
```

**Success!** Press Ctrl+C to stop.

---

## Step 4: Start Your App (30 seconds)

```bash
# From project root
npm run electron:dev
```

The app will:
1. ✅ Start normally
2. ✅ Detect `USE_DEEPAGENTS=true`
3. ✅ Spawn Python backend automatically
4. ✅ Connect and initialize agent

Look for in console:
```
🧠 Using DeepAgents Service (RECOMMENDED)
✅ Python backend is ready
✅ DeepAgents initialized successfully
```

---

## Step 5: Test It! (1 minute)

In your app:

1. **Simple test:**
   - Type: "What's a good name for a villain?"
   - Should respond immediately, no todo list

2. **Complex test:**
   - Type: "Help me create an outline for a fantasy novel about a reluctant hero who discovers they're destined to save the world"
   - Should create todo list automatically
   - Watch todos update in real-time
   - See planning-agent mentioned
   - Get comprehensive outline

3. **File test:**
   - Type: "Create a character profile for the protagonist"
   - Should create a file in your project
   - Check project folder for new file

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Todo lists appear for complex requests
- ✅ Text streams in real-time (word-by-word)
- ✅ Subagents mentioned (planning-agent, writing-agent, editing-agent)
- ✅ Files actually created in your project folder
- ✅ Console shows agent activity

---

## 🆘 Troubleshooting

### "ModuleNotFoundError: No module named 'deepagents'"
**Fix**: Run `python backend/setup.py`

### "Failed to connect to backend"
**Fix**: Make sure Python backend is running (Step 3)

### "CLAUDE_API_KEY not found"
**Fix**: Check your .env file has the API key

### Backend won't start
**Fix**: 
```bash
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## 🎉 You're Done!

Your Author app now has:
- ✅ Sophisticated agent orchestration
- ✅ Automatic task planning with todo lists
- ✅ 3 specialized subagents (Planning, Writing, Editing)
- ✅ Real-time streaming responses
- ✅ Real file operations
- ✅ Multi-provider support (OpenRouter)

**All without needing Claude subscription or desktop app!**

---

## Next Steps

- Try: "Write Chapter 1 of my fantasy novel"
- Try: "Create backstories for 3 main characters" (parallel execution!)
- Try: "Review and improve this chapter" (editing agent)

Read full docs: `backend/README.md`

**Happy writing!** 📚✨
