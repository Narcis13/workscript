import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// FileProcessor - File upload and processing component
import React, { useState } from 'react';
import { WorkflowUIComponent } from '@workscript/engine';
export const FileProcessor = ({ acceptedTypes, maxSize = 5 * 1024 * 1024, // 5MB
multiple = false, processOnUpload = false, nodeId, onInteraction }) => {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const handleFileSelect = (selectedFiles) => {
        const fileArray = Array.from(selectedFiles);
        setFiles(fileArray);
        onInteraction({
            type: 'files_selected',
            data: { files: fileArray },
            nodeId,
            timestamp: Date.now()
        });
    };
    return (_jsxs("div", { className: "workflow-file-processor", children: [_jsxs("div", { className: `file-drop-zone ${dragActive ? 'drag-active' : ''}`, children: [_jsx("input", { type: "file", accept: acceptedTypes.join(','), multiple: multiple, onChange: (e) => e.target.files && handleFileSelect(e.target.files), className: "file-input" }), _jsxs("div", { className: "drop-zone-content", children: [_jsx("p", { children: "Drop files here or click to select" }), _jsxs("small", { children: ["Accepted: ", acceptedTypes.join(', ')] }), _jsxs("small", { children: ["Max size: ", (maxSize / 1024 / 1024).toFixed(1), " MB"] })] })] }), files.length > 0 && (_jsx("div", { className: "file-list", children: files.map((file, index) => (_jsxs("div", { className: "file-item", children: [_jsx("span", { children: file.name }), _jsxs("span", { className: "file-size", children: [(file.size / 1024).toFixed(1), " KB"] })] }, index))) }))] }));
};
export default FileProcessor;
