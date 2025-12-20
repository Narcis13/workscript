/**
 * ContentEditor Component
 *
 * Monaco editor wrapper for editing resource content.
 *
 * @module components/resources/ContentEditor
 */

import { useRef, lazy, Suspense } from 'react';
import type { OnMount, OnChange } from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResourceType } from '@/types/resource.types';

// Flag to track if Monaco has been initialized
let monacoInitialized = false;

// Initialize Monaco with proper worker configuration
async function initMonaco() {
  if (monacoInitialized) return;

  // Dynamically import monaco-editor to avoid issues with SSR/initial load
  const monaco = await import('monaco-editor');

  // Import workers
  const editorWorker = await import('monaco-editor/esm/vs/editor/editor.worker?worker');
  const jsonWorker = await import('monaco-editor/esm/vs/language/json/json.worker?worker');

  // Configure Monaco environment BEFORE loading
  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'json') {
        return new jsonWorker.default();
      }
      return new editorWorker.default();
    },
  };

  // Configure the loader to use the local monaco instance
  loader.config({ monaco });

  monacoInitialized = true;
}

// Start initialization immediately
const monacoPromise = initMonaco();

const Editor = lazy(() =>
  monacoPromise.then(() => import('@monaco-editor/react').then(mod => ({ default: mod.Editor })))
);

const languageMap: Record<ResourceType, string> = {
  prompt: 'markdown',
  document: 'markdown',
  data: 'json',
  image: 'text',
  audio: 'text',
};

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  resourceType: ResourceType;
  readOnly?: boolean;
  height?: string;
}

export function ContentEditor({
  value,
  onChange,
  resourceType,
  readOnly = false,
  height = '500px',
}: ContentEditorProps) {
  const { theme, systemTheme } = useTheme();
  const editorRef = useRef<any>(null);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';
  const language = languageMap[resourceType] || 'text';

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger external save handler
      const event = new CustomEvent('editor-save', { detail: editor.getValue() });
      window.dispatchEvent(event);
    });
  };

  const handleChange: OnChange = (value) => {
    onChange(value || '');
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Suspense fallback={<Skeleton className="h-full w-full" style={{ height }} />}>
        <Editor
          height={height}
          language={language}
          value={value}
          onChange={handleChange}
          onMount={handleMount}
          theme={monacoTheme}
          loading={<Skeleton className="h-full w-full" />}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            tabSize: 2,
          }}
        />
      </Suspense>
    </div>
  );
}

export default ContentEditor;
