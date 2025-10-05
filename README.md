# Author - AI-Powered Book Writing Desktop Application

**The Windsurf/Cursor for book writing** - A revolutionary desktop application that brings agentic AI capabilities to book writing, featuring intelligent AI agents that can plan, write, edit, and manage entire book projects.

## 🚀 Features

### Core Capabilities
- **Multi-Agent AI System**: Specialized AI agents for planning, writing, editing, and research
- **Local-First Architecture**: Complete control over manuscripts and intellectual property
- **Professional Writing Environment**: IDE-like experience optimized for authors
- **Context Preservation**: Virtual file system maintains agent context across sessions
- **Advanced Project Management**: Hierarchical organization with version control

### AI Agents
- **Cascade Orchestrator**: Main coordination agent for project management
- **Planning Agent**: Story structure, character arcs, and plot development
- **Writing Agent**: Content generation with style consistency
- **Editing Agent**: Multi-level editing from developmental to proofreading
- **Research Agent**: Fact-checking and reference management

### Writing Tools
- **Advanced Editor**: Monaco editor integration with real-time AI assistance
- **Character Management**: Comprehensive character profiles and relationship mapping
- **Story Outline**: Interactive story structure and plot point tracking
- **Research Center**: Organized research notes and reference management
- **Analytics Dashboard**: Writing progress and productivity insights

## 🛠 Technology Stack

- **Desktop Framework**: Electron 28+ with TypeScript
- **Frontend**: React 18+ with modern hooks and state management
- **AI Integration**: Claude Agents SDK with custom MCP planning tools
- **Database**: SQLite with better-sqlite3 for local data storage
- **Build System**: Webpack 5+ with cross-platform packaging
- **Testing**: Jest with React Testing Library

## 📋 Development Status

Currently in **Phase 1: Foundation & Core Architecture** (Weeks 1-2)

### ✅ Completed
- [x] Project structure and development environment setup
- [x] TypeScript configuration with strict settings
- [x] Webpack build system for main and renderer processes
- [x] Electron main process with secure IPC communication
- [x] React renderer with routing and state management
- [x] Service classes for project, file, and database management
- [x] SQLite database with schema and migrations
- [x] Basic UI components and styling

### 🔄 In Progress
- [ ] Claude Agents SDK integration with custom MCP tools
- [ ] Virtual file system for agent documentation
- [ ] Dependency installation and build testing

### 📅 Next Steps (Phase 1, Weeks 3-4)
- [ ] Complete AI agent integration
- [ ] Implement file watching and auto-save
- [ ] Add version control system
- [ ] Create comprehensive test suite

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 8+
- Git for version control
- Claude API access for AI features

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd author
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Claude API key to .env
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

### Development Scripts

```bash
# Development
npm run dev              # Start both main and renderer in development
npm run dev:main         # Start main process only
npm run dev:renderer     # Start renderer process only

# Building
npm run build           # Build for production
npm run build:main      # Build main process
npm run build:renderer  # Build renderer process

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format code with Prettier
npm run type-check     # TypeScript type checking

# Distribution
npm run pack          # Package without installer
npm run dist          # Create installer for current platform
npm run dist:win      # Create Windows installer
npm run dist:mac      # Create macOS installer
npm run dist:linux    # Create Linux installer
```

## 📁 Project Structure

```
author/
├── src/
│   ├── main/           # Electron main process
│   │   ├── services/   # Business logic services
│   │   ├── utils/      # Utility functions
│   │   ├── main.ts     # Main entry point
│   │   └── preload.ts  # Secure IPC bridge
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   ├── store/      # State management
│   │   ├── styles/     # CSS styles
│   │   └── index.tsx   # Renderer entry point
│   ├── shared/         # Shared types and utilities
│   └── agents/         # AI agent implementations
├── assets/             # Static assets
├── docs/              # Documentation
├── tests/             # Test files
├── AUTHOR_GUIDE/      # Development guidelines
├── AUTHOR_PROGRESS/   # Progress tracking
└── REFERENCES/        # Technical references
```

## 🧪 Testing

The project uses Jest with React Testing Library for comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

## 📖 Documentation

- **[Master Development Plan](AUTHOR_GUIDE/MASTER_DEVELOPMENT_PLAN.md)**: Complete 8-month roadmap
- **[Technical Architecture](AUTHOR_GUIDE/TECHNICAL_ARCHITECTURE.md)**: System design and architecture
- **[Agent System](AUTHOR_GUIDE/AGENT_SYSTEM_ARCHITECTURE.md)**: AI agent coordination framework
- **[Custom Planning Tools](AUTHOR_GUIDE/CUSTOM_PLANNING_TOOLS.md)**: MCP tool implementation

## 🤝 Contributing

This project follows the comprehensive development plan outlined in the AUTHOR_GUIDE directory. Please refer to the guidelines before contributing.

## 📄 License

MIT License - see LICENSE file for details.

## 🎯 Vision

Author aims to revolutionize book writing by bringing the power of agentic AI to authors, publishers, and content creators. By combining the sophisticated planning capabilities of modern AI agents with a professional, local-first writing environment, we're creating the definitive tool for serious book writing projects.

---

**Built with ❤️ for authors who want to focus on creativity while AI handles the complexity.**