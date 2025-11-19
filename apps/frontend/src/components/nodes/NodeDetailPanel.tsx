/**
 * NodeDetailPanel Component
 *
 * Displays comprehensive metadata and documentation for a workflow node.
 * Organizes information into sections: Overview, Inputs, Outputs, and AI Hints.
 * Provides syntax-highlighted code snippets with copy functionality.
 *
 * Features:
 * - Tabbed section organization for easy navigation
 * - Overview section with name, version, description
 * - Inputs and Outputs lists with detailed information
 * - AI Hints section with purpose, usage, examples
 * - Syntax-highlighted JSON code snippets
 * - Copy-to-clipboard buttons for code examples
 * - Responsive layout for mobile and desktop
 *
 * @module components/nodes/NodeDetailPanel
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  CheckCheck,
  Info,
  ArrowRight,
  FileCode,
  Download,
  Upload,
  Lightbulb,
  Code2
} from 'lucide-react';
import type { NodeMetadata } from '@/types/node.types';
import { NodeSource } from '@/types/node.types';
import { useToast } from '@/hooks/use-toast';

/**
 * Props for the NodeDetailPanel component
 */
export interface NodeDetailPanelProps {
  /**
   * Node metadata to display
   */
  node: NodeMetadata;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * CodeSnippet Component
 *
 * Displays a JSON code snippet with syntax highlighting and copy button.
 */
interface CodeSnippetProps {
  /**
   * Code to display (JSON object or string)
   */
  code: string | object;

  /**
   * Language for syntax highlighting (default: json)
   */
  language?: 'json' | 'javascript' | 'typescript';

  /**
   * Optional label for the snippet
   */
  label?: string;

  /**
   * Optional CSS class name
   */
  className?: string;
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  language = 'json',
  label,
  className
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  /**
   * Format code for display
   */
  const formattedCode = typeof code === 'string'
    ? code
    : JSON.stringify(code, null, 2);

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      toast({
        title: 'Copied to clipboard',
        description: 'Code snippet copied successfully',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy code to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`relative ${className || ''}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2"
          >
            {copied ? (
              <>
                <CheckCheck className="h-4 w-4 mr-1 text-green-500" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      )}
      <div className="relative group">
        {!label && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            {copied ? (
              <CheckCheck className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
        <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm border">
          <code className={`language-${language}`}>
            {formattedCode}
          </code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Get the appropriate icon for a node source
 */
const getSourceBadgeVariant = (source: NodeSource): 'default' | 'secondary' | 'outline' => {
  switch (source) {
    case NodeSource.UNIVERSAL:
      return 'default';
    case NodeSource.SERVER:
      return 'secondary';
    case NodeSource.CLIENT:
      return 'outline';
    default:
      return 'outline';
  }
};

/**
 * NodeDetailPanel Component
 *
 * Displays complete node metadata with tabbed sections for Overview, Inputs, Outputs, and AI Hints.
 *
 * @example
 * ```tsx
 * <NodeDetailPanel node={nodeMetadata} />
 * ```
 */
export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl">{node.name}</CardTitle>
            <CardDescription className="text-sm font-mono mt-1">
              {node.id}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline">v{node.version}</Badge>
            <Badge variant={getSourceBadgeVariant(node.source)} className="capitalize">
              {node.source}
            </Badge>
            {node.deprecated && (
              <Badge variant="destructive">Deprecated</Badge>
            )}
          </div>
        </div>
        {node.description && (
          <p className="text-sm text-muted-foreground mt-3">
            {node.description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Info className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inputs">
              <Download className="h-4 w-4 mr-2" />
              Inputs
            </TabsTrigger>
            <TabsTrigger value="outputs">
              <Upload className="h-4 w-4 mr-2" />
              Outputs
            </TabsTrigger>
            <TabsTrigger value="ai-hints">
              <Lightbulb className="h-4 w-4 mr-2" />
              AI Hints
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-2">Node Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Node ID</p>
                    <p className="text-sm font-mono">{node.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="text-sm">{node.version}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm capitalize">{node.source}</p>
                  </div>
                  {node.category && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm capitalize">{node.category}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {node.description || 'No description available'}
                </p>
              </div>

              {node.deprecated && (
                <>
                  <Separator />
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-destructive mb-2">
                      ⚠️ Deprecated
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {node.deprecationMessage || 'This node is deprecated and may be removed in future versions.'}
                    </p>
                  </div>
                </>
              )}

              {node.tags && node.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {node.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs" className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Expected Configuration Inputs</h3>
              {node.inputs && node.inputs.length > 0 ? (
                <div className="space-y-2">
                  {node.inputs.map((input, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-semibold">{input}</code>
                        <Badge variant="outline" className="text-xs">
                          field
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Configuration field expected by this node
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No input fields defined</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Outputs Tab */}
          <TabsContent value="outputs" className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">State Keys Modified</h3>
              {node.outputs && node.outputs.length > 0 ? (
                <div className="space-y-2">
                  {node.outputs.map((output, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-semibold">{output}</code>
                        <Badge variant="outline" className="text-xs">
                          state key
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This state key may be modified by the node during execution
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No output fields defined</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI Hints Tab */}
          <TabsContent value="ai-hints" className="space-y-4">
            {node.ai_hints ? (
              <div className="space-y-4">
                {/* Purpose */}
                {node.ai_hints.purpose && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Purpose
                    </h3>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border">
                      {node.ai_hints.purpose}
                    </p>
                  </div>
                )}

                {/* When to Use */}
                {node.ai_hints.when_to_use && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      When to Use
                    </h3>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border">
                      {node.ai_hints.when_to_use}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Expected Edges */}
                {node.ai_hints.expected_edges && node.ai_hints.expected_edges.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Expected Edges</h3>
                    <div className="flex flex-wrap gap-2">
                      {node.ai_hints.expected_edges.map((edge) => (
                        <Badge key={edge} variant="secondary" className="text-xs">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          {edge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Example Usage */}
                {node.ai_hints.example_usage && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Code2 className="h-4 w-4" />
                      Example Usage
                    </h3>
                    <CodeSnippet
                      code={node.ai_hints.example_usage}
                      label="Workflow JSON"
                    />
                  </div>
                )}

                {/* Example Config */}
                {node.ai_hints.example_config && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      Example Configuration
                    </h3>
                    <CodeSnippet
                      code={node.ai_hints.example_config}
                      label="Node Config"
                    />
                  </div>
                )}

                <Separator />

                {/* State Access */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Get from State */}
                  {node.ai_hints.get_from_state && node.ai_hints.get_from_state.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Reads from State</h3>
                      <div className="space-y-1">
                        {node.ai_hints.get_from_state.map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <Download className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs font-mono">{key}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post to State */}
                  {node.ai_hints.post_to_state && node.ai_hints.post_to_state.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Writes to State</h3>
                      <div className="space-y-1">
                        {node.ai_hints.post_to_state.map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <Upload className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs font-mono">{key}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <h3 className="text-sm font-semibold mb-1">No additional hints available</h3>
                <p className="text-xs">
                  This node doesn't have AI hints configured yet.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/**
 * Export NodeDetailPanel as default
 */
export default NodeDetailPanel;
