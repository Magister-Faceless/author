"""
Setup script for Author backend
Run this to set up the Python environment
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and print output"""
    print(f"\n🔧 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed with code {result.returncode}")

def main():
    backend_dir = Path(__file__).parent
    venv_dir = backend_dir / 'venv'
    
    print("="*60)
    print("  Author Backend Setup")
    print("  Setting up Python environment for DeepAgents")
    print("="*60)
    
    # Check Python version
    py_version = sys.version_info
    if py_version < (3, 9):
        print(f"❌ Python 3.9+ required, found {py_version.major}.{py_version.minor}")
        sys.exit(1)
    
    print(f"✅ Python {py_version.major}.{py_version.minor}.{py_version.micro}")
    
    # Create virtual environment
    print("\n📦 Creating virtual environment...")
    if not venv_dir.exists():
        run_command([sys.executable, "-m", "venv", str(venv_dir)])
        print("✅ Virtual environment created")
    else:
        print("ℹ️  Virtual environment already exists")
    
    # Determine pip path
    if sys.platform == "win32":
        pip_path = venv_dir / "Scripts" / "pip.exe"
        python_path = venv_dir / "Scripts" / "python.exe"
    else:
        pip_path = venv_dir / "bin" / "pip"
        python_path = venv_dir / "bin" / "python"
    
    # Upgrade pip
    print("\n📦 Upgrading pip...")
    run_command([str(python_path), "-m", "pip", "install", "--upgrade", "pip"])
    
    # Install requirements
    print("\n📦 Installing dependencies...")
    requirements_file = backend_dir / "requirements.txt"
    if requirements_file.exists():
        run_command([str(pip_path), "install", "-r", str(requirements_file)])
        print("✅ Dependencies installed")
    else:
        print("⚠️  requirements.txt not found")
    
    # Copy model configuration
    print("\n📝 Setting up model configuration...")
    ref_model = backend_dir.parent / "REFERENCES" / "deepagents_ref" / "model2.py"
    target_model = backend_dir.parent / "deepagents" / "src" / "deepagents" / "model.py"
    
    if ref_model.exists() and target_model.exists():
        import shutil
        shutil.copy2(ref_model, target_model)
        print("✅ Model configuration updated")
    
    print("\n" + "="*60)
    print("✅ Setup Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Make sure your .env file has:")
    print("   - CLAUDE_API_KEY (OpenRouter key)")
    print("   - CLAUDE_API_BASE_URL=https://openrouter.ai/api/v1")
    print("   - CLAUDE_MODEL=x-ai/grok-4-fast")
    print("   - SUBAGENT_MODEL=alibaba/tongyi-deepresearch-30b-a3b")
    print("   - USE_DEEPAGENTS=true")
    print("\n2. Test the backend:")
    print(f"   {python_path} main.py")
    print("\n3. Start the Electron app with DeepAgents enabled")

if __name__ == "__main__":
    main()
