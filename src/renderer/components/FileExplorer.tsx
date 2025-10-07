import React, { useState, useEffect } from 'react';
import { useAppStore, FileNode } from '../store/app-store';

export const FileExplorer: React.FC = () => {
  const {
    currentProject,
    fileTree,
    setFileTree,
    expandedFolders,
    toggleFolder,
    selectedFile,
    setSelectedFile,
    openTab
  } = useAppStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode;
  } | null>(null);
  
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [fileType, setFileType] = useState('.md');

  useEffect(() => {
    if (currentProject) {
      loadFileTree();
    }
  }, [currentProject]);

  // Listen for file operations from agent and refresh
  useEffect(() => {
    const handleFileOperation = () => {
      console.log('File operation detected, refreshing tree...');
      setTimeout(() => loadFileTree(), 500);
    };

    if ((window as any).electronAPI?.on) {
      (window as any).electronAPI.on('agent:file-operation', handleFileOperation);
      
      return () => {
        if ((window as any).electronAPI?.removeListener) {
          (window as any).electronAPI.removeListener('agent:file-operation', handleFileOperation);
        }
      };
    }
    return undefined;
  }, [currentProject]);

  const loadFileTree = async () => {
    if (!currentProject) {
      console.log('No current project');
      return;
    }

    if (!currentProject.path) {
      console.error('Current project has no path:', currentProject);
      return;
    }

    try {
      console.log('Loading file tree for:', currentProject.path);
      // Load the project directory structure
      const tree = await buildFileTree(currentProject.path);
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  };

  const buildFileTree = async (dirPath: string): Promise<FileNode[]> => {
    try {
      const response = await (window as any).electronAPI.file.list(dirPath);
      console.log('File list response:', response);
      const files = response.data || response;
      
      if (!Array.isArray(files)) {
        console.warn('Files is not an array:', files);
        return [];
      }

      console.log('Files found:', files.length, files);

      const nodes: FileNode[] = [];
      
      // Process all items
      for (const file of files) {
        // Check if it's a directory
        const isDirectory = file.type === 'directory' || file.type === 'folder';
        const fileName = file.name || (typeof file === 'string' ? file : file.path?.split(/[/\\]/).pop() || 'Unknown');
        const filePath = file.path || (typeof file === 'string' ? `${dirPath}/${file}` : file);

        if (isDirectory) {
          nodes.push({
            id: filePath,
            name: fileName,
            path: filePath,
            type: 'folder',
            children: [],
            isExpanded: false
          });
        } else {
          nodes.push({
            id: filePath,
            name: fileName,
            path: filePath,
            type: 'file'
          });
        }
      }

      console.log('Built nodes:', nodes);
      return nodes;
    } catch (error) {
      console.error('Error building file tree:', error);
      return [];
    }
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
      // Load children if not loaded
      if (!node.children || node.children.length === 0) {
        const children = await buildFileTree(node.path);
        // Update the tree with children
        setFileTree(fileTree.map(n => 
          n.id === node.id ? { ...n, children } : n
        ));
      }
    } else {
      // Open file in editor
      setSelectedFile(node.path);
      try {
        const content = await (window as any).electronAPI.file.read(node.path);
        openTab({
          path: node.path,
          name: node.name,
          content: content.data || content || ''
        });
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleNewFile = async () => {
    if (!contextMenu || !currentProject) return;
    
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
      const parentPath = contextMenu.node.type === 'folder' 
        ? contextMenu.node.path 
        : currentProject.path;
      
      const filePath = `${parentPath}/${fileName}`;
      await (window as any).electronAPI.file.write(filePath, '');
      loadFileTree();
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file');
    }
    
    setContextMenu(null);
  };

  const handleNewFolder = async () => {
    if (!contextMenu || !currentProject) return;
    
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const parentPath = contextMenu.node.type === 'folder' 
        ? contextMenu.node.path 
        : currentProject.path;
      
      const folderPath = `${parentPath}/${folderName}`;
      // Create folder by creating a placeholder file
      await (window as any).electronAPI.file.write(`${folderPath}/.gitkeep`, '');
      loadFileTree();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
    
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    
    if (!confirm(`Delete ${contextMenu.node.name}?`)) return;

    try {
      await (window as any).electronAPI.file.delete(contextMenu.node.path);
      await loadFileTree();
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete file');
    }
  };

  const handleCreateFile = async () => {
    if (!currentProject || !newFileName.trim()) return;

    try {
      // Add file extension if not present
      const fileName = newFileName.includes('.') ? newFileName : `${newFileName}${fileType}`;
      const filePath = `${currentProject.path}/${fileName}`;
      await (window as any).electronAPI.file.write(filePath, '');
      await loadFileTree();
      setShowNewFileDialog(false);
      setNewFileName('');
      setFileType('.md'); // Reset to default
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file');
    }
  };

  const handleCreateFolder = async () => {
    if (!currentProject || !newFolderName.trim()) return;

    try {
      const folderPath = `${currentProject.path}/${newFolderName}`;
      // Create a placeholder file in the folder to ensure it exists
      await (window as any).electronAPI.file.write(`${folderPath}/.gitkeep`, '');
      await loadFileTree();
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.id}>
        <div
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            paddingLeft: `${8 + level * 16}px`,
            cursor: 'pointer',
            backgroundColor: isSelected ? '#2a2a2a' : 'transparent',
            color: '#cccccc',
            fontSize: '13px',
            userSelect: 'none',
            transition: 'background-color 0.1s'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = '#2a2a2a';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {node.type === 'folder' && (
            <span style={{ marginRight: '4px', fontSize: '10px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span style={{ marginRight: '6px' }}>
            {node.type === 'folder' ? '📁' : '📄'}
          </span>
          <span>{node.name}</span>
        </div>
        
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#252526',
      color: '#cccccc',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#2d2d30',
        borderBottom: '1px solid #3c3c3c',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: '#999',
        letterSpacing: '0.5px',
        flexShrink: 0
      }}>
        EXPLORER
      </div>

      {/* Project Name & Actions */}
      {currentProject && (
        <div style={{
          padding: '6px 8px',
          fontSize: '13px',
          fontWeight: 400,
          borderBottom: '1px solid #3a3a3a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e1e1e'
        }}>
          <span>{currentProject.name}</span>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setShowNewFileDialog(true)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#3a3a3a',
                border: 'none',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px'
              }}
              title="New File"
            >
              📄
            </button>
            <button
              onClick={() => setShowNewFolderDialog(true)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#3a3a3a',
                border: 'none',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px'
              }}
              title="New Folder"
            >
              📁
            </button>
            <button
              onClick={loadFileTree}
              style={{
                padding: '4px 8px',
                backgroundColor: '#3a3a3a',
                border: 'none',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px'
              }}
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {/* File Tree */}
      <div style={{ 
        padding: '4px 0',
        flex: 1,
        overflowY: 'auto'
      }}>
        {fileTree.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#888',
            fontSize: '12px'
          }}>
            No files found
          </div>
        ) : (
          fileTree.map(node => renderNode(node))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: '#2a2a2a',
              border: '1px solid #3a3a3a',
              borderRadius: '4px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              zIndex: 1000,
              minWidth: '150px'
            }}
          >
            <div
              onClick={handleNewFile}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: '1px solid #3a3a3a'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              New File
            </div>
            <div
              onClick={handleNewFolder}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                borderBottom: '1px solid #3a3a3a'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              New Folder
            </div>
            <div
              onClick={handleDelete}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#f48771'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Delete
            </div>
          </div>
        </>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '300px',
            border: '1px solid #3a3a3a'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
              placeholder="filename"
              autoFocus
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1e1e1e',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                color: '#ccc',
                fontSize: '13px',
                marginBottom: '12px'
              }}
            />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
                File Type:
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #3a3a3a',
                  borderRadius: '4px',
                  color: '#ccc',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value=".md">Markdown (.md)</option>
                <option value=".txt">Text (.txt)</option>
                <option value=".csv">CSV (.csv)</option>
                <option value=".py">Python (.py)</option>
                <option value=".js">JavaScript (.js)</option>
                <option value=".ts">TypeScript (.ts)</option>
                <option value=".tsx">TypeScript React (.tsx)</option>
                <option value=".jsx">JavaScript React (.jsx)</option>
                <option value=".json">JSON (.json)</option>
                <option value=".html">HTML (.html)</option>
                <option value=".css">CSS (.css)</option>
                <option value=".yaml">YAML (.yaml)</option>
                <option value=".yml">YAML (.yml)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNewFileDialog(false);
                  setNewFileName('');
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3a3a3a',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ccc',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#4a9eff',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '300px',
            border: '1px solid #3a3a3a'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="foldername"
              autoFocus
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#1e1e1e',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                color: '#ccc',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3a3a3a',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ccc',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#4a9eff',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
