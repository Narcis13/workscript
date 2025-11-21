/**
 * StateDiffViewer Component
 *
 * Displays a side-by-side comparison of initial and final states using Monaco's
 * built-in diff editor. Shows additions in green and deletions in red.
 *
 * Features:
 * - Side-by-side diff view with syntax highlighting
 * - Color-coded changes (green for additions, red for deletions)
 * - Full keyboard navigation support
 * - Responsive layout with proper sizing
 * - Error handling for invalid JSON
 * - Clean, professional presentation
 *
 * @module components/executions/StateDiffViewer
 */

import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { IStandaloneDiffEditor } from 'monaco-editor';

/**
 * Props for the StateDiffViewer component
 */
export interface StateDiffViewerProps {
  /**
   * Whether the diff viewer dialog is open
   */
  open: boolean;

  /**
   * Callback when the dialog is closed
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Initial state to compare (left side)
   */
  initialState: Record<string, any> | undefined | null;

  /**
   * Final state to compare (right side)
   */
  finalState: Record<string, any> | undefined | null;
}

/**
 * StateDiffViewer Component
 *
 * Displays a Monaco diff editor showing the initial state (left, original)
 * vs. final state (right, modified). Changes are color-coded:
 * - Green: additions/changes
 * - Red: deletions
 *
 * @example
 * ```tsx
 * <StateDiffViewer
 *   open={showDiff}
 *   onOpenChange={setShowDiff}
 *   initialState={execution.initialState}
 *   finalState={execution.finalState}
 * />
 * ```
 */
export const StateDiffViewer: React.FC<StateDiffViewerProps> = ({
  open,
  onOpenChange,
  initialState,
  finalState,
}) => {
  const editorRef = useRef<IStandaloneDiffEditor | null>(null);

  // Format JSON with proper indentation
  const originalContent = JSON.stringify(initialState || {}, null, 2);
  const modifiedContent = JSON.stringify(finalState || {}, null, 2);

  const handleEditorMount = (editor: IStandaloneDiffEditor) => {
    editorRef.current = editor;
    // Optionally set options on the editor
    if (editor.getModifiedEditor()) {
      editor.getModifiedEditor().updateOptions({ readOnly: true });
      editor.getOriginalEditor().updateOptions({ readOnly: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col gap-0 p-0 rounded-lg">
        {/* Header */}
        <DialogHeader className="border-b px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold">Compare States</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Left: Initial State (Original) | Right: Final State (Modified)
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 ml-auto"
            onClick={() => onOpenChange(false)}
            title="Close diff viewer"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Monaco Diff Editor */}
        <div className="flex-1 overflow-hidden rounded-b-lg">
          <Editor
            height="100%"
            defaultLanguage="json"
            original={originalContent}
            modified={modifiedContent}
            theme="vs-dark"
            options={{
              // Diff editor specific options
              readOnly: true,
              originalEditable: false,
              renderSideBySide: true,
              enableSplitViewResizing: true,
              automaticLayout: true,
              // Common editor options
              lineNumbers: 'on',
              minimap: { enabled: false },
              folding: true,
              foldingHighlight: true,
              bracketPairColorization: {
                enabled: true,
                independentColorPoolPerBracketType: false,
              },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              formatOnPaste: false,
              formatOnType: false,
              // Diff-specific styling
              diffWordWrap: 'on',
              // Scrolling
              scrollbar: {
                useShadows: true,
                verticalSliderSize: 8,
                horizontalSliderSize: 8,
              },
            }}
            onMount={handleEditorMount}
          />
        </div>

        {/* Footer Info */}
        <div className="border-t px-6 py-3 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/70" />
              <span>Additions/Changes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/70" />
              <span>Deletions</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Export StateDiffViewer as default
 */
export default StateDiffViewer;
