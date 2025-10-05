# 🚀 How to Start the Author App with DeepAgents

## Quick Start (All-in-One)

### Option 1: Install wait-on and use npm start

```bash
# Install wait-on (one time only)
npm install --save-dev wait-on

# Start everything at once
npm start
```

This will:
1. ✅ Start Webpack (main process)
2. ✅ Start React dev server (port 3000)
3. ✅ Wait for server to be ready
4. ✅ Start Electron app
5. ✅ Python backend spawns automatically

---

### Option 2: Manual (Two Terminals)

**Terminal 1 - Start Dev Servers:**
```bash
npm run dev
```

Wait until you see:
```
webpack compiled successfully
```

**Terminal 2 - Start Electron:**
```bash
npm run electron:dev
```

---

## What You Should See

### Terminal Output

```
🧠 Using DeepAgents Service (RECOMMENDED)
Starting Python backend...
[Python Backend] Starting server at http://127.0.0.1:8765
✅ Python backend is ready
✅ DeepAgents initialized successfully
```

### Application Window

- Electron window opens
- React UI loads
- Chat interface ready

---

## Troubleshooting

### "Using OpenRouter Agent Service (LEGACY)"

**Problem:** DeepAgents not activating

**Solution:** Check your `.env` file has:
```env
USE_DEEPAGENTS=true
USE_CLAUDE_SDK=false
```

### "Failed to load URL: http://localhost:3000/"

**Problem:** React dev server not running

**Solution:** 
- Make sure `npm run dev` is running first
- Wait for "webpack compiled successfully"
- Then start Electron

### "Failed to start Python backend"

**Problem:** Python environment not set up

**Solution:**
```bash
cd backend
python setup.py
```

### "Module not found" errors

**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
cd backend
python setup.py
```

---

## Development Workflow

### Daily Development

```bash
# Start everything
npm start
```

That's it! The app will:
- Compile TypeScript
- Start React hot reload
- Launch Electron
- Spawn Python backend
- Connect to DeepAgents

### Testing Backend Only

```bash
cd backend
.\venv\Scripts\activate
python main.py
```

Test with: `http://127.0.0.1:8765/health`

---

## Verify DeepAgents is Working

1. **Check console logs:**
   - Look for: `🧠 Using DeepAgents Service (RECOMMENDED)`
   - Should NOT see: `Using OpenRouter Agent Service (LEGACY)`

2. **Test in app:**
   - Type: "Help me outline a fantasy novel"
   - Should create todo list automatically
   - Should see todo items update in real-time
   - Should mention planning-agent/writing-agent

3. **Check Python backend:**
   - Open: http://127.0.0.1:8765/health
   - Should return: `{"status": "healthy"}`

---

## Summary

**Easiest Way:**
```bash
npm install --save-dev wait-on  # One time
npm start                        # Every time
```

**Manual Way (More Control):**
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for webpack to compile)
npm run electron:dev
```

---

**Status**: Python backend setup ✅ complete, ready to run!
