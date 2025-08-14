// FileProcessor - File upload and processing component

import React, { useState } from 'react';
import { WorkflowUIComponent } from 'shared';

interface FileProcessorProps extends WorkflowUIComponent {
  acceptedTypes: string[];
  maxSize?: number;
  multiple?: boolean;
  processOnUpload?: boolean;
}

export const FileProcessor: React.FC<FileProcessorProps> = ({
  acceptedTypes,
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = false,
  processOnUpload = false,
  nodeId,
  onInteraction
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileSelect = (selectedFiles: FileList) => {
    const fileArray = Array.from(selectedFiles);
    setFiles(fileArray);
    
    onInteraction({
      type: 'files_selected',
      data: { files: fileArray },
      nodeId,
      timestamp: Date.now()
    });
  };

  return (
    <div className="workflow-file-processor">
      <div className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}>
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="file-input"
        />
        <div className="drop-zone-content">
          <p>Drop files here or click to select</p>
          <small>Accepted: {acceptedTypes.join(', ')}</small>
          <small>Max size: {(maxSize / 1024 / 1024).toFixed(1)} MB</small>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <span>{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileProcessor;