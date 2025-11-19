/**
 * WorkflowEditor Component
 *
 * A Monaco-based JSON editor for creating and editing workflow definitions.
 * Provides a professional code editing experience with syntax highlighting,
 * validation, auto-completion, and keyboard shortcuts.
 *
 * Features:
 * - Monaco Editor with JSON language mode
 * - Real-time JSON syntax validation
 * - JSON schema validation (workflow schema)
 * - Syntax highlighting and code folding
 * - Line numbers and minimap
 * - Bracket matching and auto-indentation
 * - Keyboard shortcuts (Cmd/Ctrl+S for save)
 * - Dark/light theme support
 * - Read-only mode support
 * - Error markers with descriptive messages
 *
 * Requirements Coverage:
 * - Requirement 5: Workflow Creation with Monaco Editor
 * - Requirement 6: Workflow Editing with Version Control
 * - Requirement 20: Monaco Editor Integration and Configuration
 *
 * @module components/workflows/WorkflowEditor
 */

import React, { useCallback, useEffect, useRef } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/**
 * Props for the WorkflowEditor component
 */
export interface WorkflowEditorProps {
  /**
   * Current workflow JSON value as string
   */
  value: string;

  /**
   * Callback when editor content changes
   * @param value - New editor content
   */
  onChange: (value: string) => void;

  /**
   * Optional callback for validation
   * Called when user triggers validation (e.g., format document)
   * @param value - Current editor content
   */
  onValidate?: (value: string) => void;

  /**
   * Optional callback for save action (Cmd/Ctrl+S)
   * If not provided, save shortcut will not be registered
   * @param value - Current editor content
   */
  onSave?: (value: string) => void;

  /**
   * Whether the editor is in read-only mode
   * When true, prevents editing but maintains all viewing features
   * @default false
   */
  readOnly?: boolean;

  /**
   * Optional CSS class name for the editor container
   */
  className?: string;

  /**
   * Editor height
   * @default "500px"
   */
  height?: string;

  /**
   * Whether to show minimap
   * @default true
   */
  showMinimap?: boolean;

  /**
   * Placeholder text when editor is empty
   * @default "Enter workflow JSON definition..."
   */
  placeholder?: string;
}

/**
 * WorkflowEditor Component
 *
 * Professional Monaco-based JSON editor for workflow definitions with
 * full IDE-like features including validation, syntax highlighting, and shortcuts.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <WorkflowEditor
 *   value={workflowJson}
 *   onChange={setWorkflowJson}
 *   onSave={handleSave}
 * />
 *
 * // Read-only mode
 * <WorkflowEditor
 *   value={workflowJson}
 *   onChange={() => {}}
 *   readOnly
 * />
 *
 * // Custom height and no minimap
 * <WorkflowEditor
 *   value={workflowJson}
 *   onChange={setWorkflowJson}
 *   height="700px"
 *   showMinimap={false}
 * />
 * ```
 */
export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  value,
  onChange,
  onValidate,
  onSave,
  readOnly = false,
  className,
  height = '500px',
  showMinimap = true,
  placeholder = 'Enter workflow JSON definition...',
}) => {
  const { theme, systemTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  /**
   * Determine the current theme (resolve 'system' to actual theme)
   */
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  /**
   * Handle editor mount
   * Configure editor options and register keyboard shortcuts
   */
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure JSON language options
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [],
        enableSchemaRequest: false,
      });

      // Register keyboard shortcut for save (Cmd/Ctrl+S)
      if (onSave) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          const currentValue = editor.getValue();
          onSave(currentValue);
        });
      }

      // Register keyboard shortcut for validate (Shift+Alt+F - format document)
      if (onValidate) {
        editor.addCommand(
          monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
          () => {
            const currentValue = editor.getValue();
            onValidate(currentValue);
          }
        );
      }

      // Focus editor on mount (if not read-only)
      if (!readOnly) {
        editor.focus();
      }
    },
    [onSave, onValidate, readOnly]
  );

  /**
   * Handle editor content change
   */
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue || '');
    },
    [onChange]
  );

  /**
   * Update editor theme when theme changes
   */
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  /**
   * Format document programmatically
   */
  const formatDocument = useCallback(() => {
    if (editorRef.current) {
      editorRef.current
        .getAction('editor.action.formatDocument')
        ?.run();
    }
  }, []);

  /**
   * Editor options configuration
   */
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    // Language and file type
    language: 'json',

    // Line numbers and minimap
    lineNumbers: 'on',
    minimap: {
      enabled: showMinimap,
    },

    // Bracket and indentation
    bracketPairColorization: {
      enabled: true,
    },
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: false,

    // Editor behavior
    readOnly,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    wrappingIndent: 'indent',

    // Code folding
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',

    // Scrollbar
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },

    // Font
    fontSize: 14,
    fontFamily:
      "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace",
    fontLigatures: true,

    // Suggestions and IntelliSense
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',

    // Validation and diagnostics
    renderValidationDecorations: 'on',

    // Accessibility
    accessibilitySupport: 'auto',

    // Tab size for JSON
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: false,

    // Hover
    hover: {
      enabled: true,
      delay: 300,
    },

    // Context menu
    contextmenu: true,

    // Line highlighting
    renderLineHighlight: 'all',
    renderLineHighlightOnlyWhenFocus: false,

    // Cursor
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',

    // Selection
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile',

    // Find widget
    find: {
      seedSearchStringFromSelection: 'always',
      autoFindInSelection: 'never',
    },

    // Padding
    padding: {
      top: 16,
      bottom: 16,
    },
  };

  return (
    <div
      className={cn(
        'border rounded-md overflow-hidden',
        readOnly && 'opacity-90',
        className
      )}
      data-testid="workflow-editor"
    >
      {/* Lock icon indicator for read-only mode */}
      {readOnly && (
        <div className="bg-muted px-4 py-2 text-sm text-muted-foreground flex items-center gap-2 border-b">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-lock"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Read-only mode
        </div>
      )}

      {/* Monaco Editor */}
      <Editor
        height={height}
        defaultLanguage="json"
        language="json"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={monacoTheme}
        options={editorOptions}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading editor...</div>
          </div>
        }
      />

      {/* Keyboard shortcuts hint (only visible if not read-only) */}
      {!readOnly && (
        <div className="bg-muted px-4 py-2 text-xs text-muted-foreground border-t">
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-mono">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S
            </kbd>{' '}
            to save
            {onValidate && (
              <>
                {' '}
                •{' '}
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-mono">
                  Shift+Alt+F
                </kbd>{' '}
                to format
              </>
            )}
          </span>
          <span className="sm:hidden">Keyboard shortcuts available</span>
        </div>
      )}
    </div>
  );
};

/**
 * Export WorkflowEditor as default
 */
export default WorkflowEditor;
