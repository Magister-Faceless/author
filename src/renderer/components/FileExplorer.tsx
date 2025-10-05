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

  useEffect(() => {
    if (currentProject) {
      loadFileTree();
    }
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
      const files = response.data || response;
      
      if (!Array.isArray(files)) return [];

      const nodes: FileNode[] = [];
      
      // Add folders first
      for (const file of files) {
        if (file.type === 'folder' || file.path.includes('/')) {
          const folderName = file.name || file.path.split('/').pop();
          nodes.push({
            id: file.path,
            name: folderName,
            path: file.path,
            type: 'folder',
            children: [],
            isExpanded: false
          });
        }
      }
      
      // Add files
      for (const file of files) {
        if (file.type !== 'folder' && !file.path.includes('/')) {
          nodes.push({
            id: file.path,
            name: file.name,
            path: file.path,
            type: 'file'
          });
        }
      }

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
      loadFileTree();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete');
    }
    
    setContextMenu(null);
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
      backgroundColor: '#252526',
      color: '#cccccc',
      overflow: 'auto',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #3a3a3a',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: '#888'
      }}>
        Explorer
      </div>

      {/* Project Name */}
      {currentProject && (
        <div style={{
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 500,
          borderBottom: '1px solid #3a3a3a'
        }}>
          {currentProject.name}
        </div>
      )}

      {/* File Tree */}
      <div style={{ padding: '4px 0' }}>
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
    </div>
  );
};
