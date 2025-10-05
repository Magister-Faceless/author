"""Real file system tools for the Author agents"""

import os
from pathlib import Path
from typing import Optional
from langchain_core.tools import tool


def create_file_tools(project_path: str):
    """
    Create file operation tools scoped to a specific project path.
    
    Args:
        project_path: Absolute path to the project directory
        
    Returns:
        List of tool functions
    """
    project_root = Path(project_path).resolve()
    
    def _resolve_path(file_path: str) -> Path:
        """Resolve a relative path to absolute path within project"""
        if Path(file_path).is_absolute():
            full_path = Path(file_path)
        else:
            full_path = project_root / file_path
        
        # Security: Ensure path is within project root
        try:
            full_path.resolve().relative_to(project_root)
        except ValueError:
            raise ValueError(f"Path {file_path} is outside project directory")
        
        return full_path
    
    @tool
    def read_real_file(file_path: str, offset: int = 0, limit: int = 2000) -> str:
        """
        Read a real file from the project.
        
        Args:
            file_path: Relative path from project root (e.g., 'chapters/chapter_01.md')
            offset: Line number to start reading from (0-indexed)
            limit: Maximum number of lines to read
            
        Returns:
            File contents with line numbers, or error message
        """
        try:
            full_path = _resolve_path(file_path)
            
            if not full_path.exists():
                return f"Error: File '{file_path}' not found"
            
            if not full_path.is_file():
                return f"Error: '{file_path}' is not a file"
            
            # Read file
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Handle empty file
            if not lines:
                return "System reminder: File exists but has empty contents"
            
            # Apply offset and limit
            start_idx = offset
            end_idx = min(start_idx + limit, len(lines))
            
            if start_idx >= len(lines):
                return f"Error: Line offset {offset} exceeds file length ({len(lines)} lines)"
            
            # Format with line numbers (cat -n format)
            result_lines = []
            for i in range(start_idx, end_idx):
                line_content = lines[i].rstrip('\n')
                
                # Truncate long lines
                if len(line_content) > 2000:
                    line_content = line_content[:2000] + "..."
                
                line_number = i + 1
                result_lines.append(f"{line_number:6d}\t{line_content}")
            
            return "\n".join(result_lines)
            
        except Exception as e:
            return f"Error reading file: {str(e)}"
    
    @tool
    def write_real_file(file_path: str, content: str) -> str:
        """
        Write to a real file in the project.
        
        Args:
            file_path: Relative path from project root (e.g., 'chapters/chapter_01.md')
            content: Content to write to the file
            
        Returns:
            Success message or error
        """
        try:
            full_path = _resolve_path(file_path)
            
            # Create directory if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return f"Successfully wrote to {file_path} ({len(content)} characters)"
            
        except Exception as e:
            return f"Error writing file: {str(e)}"
    
    @tool
    def list_real_files(directory: str = ".", pattern: Optional[str] = None) -> str:
        """
        List real files in a directory.
        
        Args:
            directory: Relative path to directory (default: project root)
            pattern: Optional glob pattern to filter files (e.g., '*.md')
            
        Returns:
            List of files as formatted string
        """
        try:
            dir_path = _resolve_path(directory)
            
            if not dir_path.exists():
                return f"Error: Directory '{directory}' not found"
            
            if not dir_path.is_dir():
                return f"Error: '{directory}' is not a directory"
            
            # List files
            if pattern:
                files = list(dir_path.glob(pattern))
            else:
                files = list(dir_path.iterdir())
            
            # Format output
            result = []
            for file in sorted(files):
                rel_path = file.relative_to(project_root)
                if file.is_dir():
                    result.append(f"📁 {rel_path}/")
                else:
                    size = file.stat().st_size
                    result.append(f"📄 {rel_path} ({size} bytes)")
            
            if not result:
                return f"No files found in {directory}" + (f" matching '{pattern}'" if pattern else "")
            
            return "\n".join(result)
            
        except Exception as e:
            return f"Error listing files: {str(e)}"
    
    @tool
    def edit_real_file(
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False
    ) -> str:
        """
        Edit a real file by replacing text.
        
        Args:
            file_path: Relative path from project root
            old_string: Exact text to find and replace
            new_string: Text to replace with
            replace_all: If True, replace all occurrences; if False, only first
            
        Returns:
            Success message or error
        """
        try:
            full_path = _resolve_path(file_path)
            
            if not full_path.exists():
                return f"Error: File '{file_path}' not found"
            
            # Read current content
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if old_string exists
            if old_string not in content:
                return f"Error: String not found in file"
            
            # Check for uniqueness if not replace_all
            if not replace_all:
                occurrences = content.count(old_string)
                if occurrences > 1:
                    return f"Error: String appears {occurrences} times in file. Use replace_all=True to replace all instances, or provide a more specific string with surrounding context."
            
            # Perform replacement
            if replace_all:
                new_content = content.replace(old_string, new_string)
                count = content.count(old_string)
                result_msg = f"Successfully replaced {count} instance(s) in '{file_path}'"
            else:
                new_content = content.replace(old_string, new_string, 1)
                result_msg = f"Successfully replaced string in '{file_path}'"
            
            # Write back
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            return result_msg
            
        except Exception as e:
            return f"Error editing file: {str(e)}"
    
    return [
        read_real_file,
        write_real_file,
        list_real_files,
        edit_real_file,
    ]
