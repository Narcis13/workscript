/**
 * InterpolationTester Component
 *
 * Test panel for prompt template interpolation with {{$.path}} syntax.
 *
 * @module components/resources/InterpolationTester
 */

import { useState } from 'react';
import { Play, Copy, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useInterpolate } from '@/hooks/api/useResources';
import { toast } from 'sonner';

interface InterpolationTesterProps {
  resourceId: string;
}

export function InterpolationTester({ resourceId }: InterpolationTesterProps) {
  const [stateInput, setStateInput] = useState('{\n  "key": "value"\n}');
  const [result, setResult] = useState<{
    output: string;
    found: string[];
    replaced: string[];
    unresolved: string[];
  } | null>(null);

  const interpolate = useInterpolate();
  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateJson = (input: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(input);
      setJsonError(null);
      return parsed;
    } catch {
      setJsonError('Invalid JSON syntax');
      return null;
    }
  };

  const handleTest = async () => {
    const state = validateJson(stateInput);
    if (!state) return;

    const response = await interpolate.mutateAsync({ id: resourceId, state });
    setResult({
      output: response.result,
      found: response.placeholders.found,
      replaced: response.placeholders.replaced,
      unresolved: response.placeholders.unresolved,
    });
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result.output);
      toast.success('Copied to clipboard');
    }
  };

  const handleClear = () => {
    setResult(null);
    setStateInput('{\n  "key": "value"\n}');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Test Interpolation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">State (JSON)</label>
          <Textarea
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder='{ "$.key": "value" }'
            className="font-mono text-sm h-32"
          />
          {jsonError && <p className="text-sm text-destructive mt-1">{jsonError}</p>}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTest}
            disabled={!!jsonError || interpolate.isPending}
            className="flex-1"
          >
            <Play className="size-4 mr-2" />
            {interpolate.isPending ? 'Testing...' : 'Test'}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Result</label>
                <Button variant="ghost" size="sm" onClick={handleCopyResult}>
                  <Copy className="size-3 mr-1" /> Copy
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap max-h-48 overflow-auto">
                {result.output}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {result.replaced.length > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="size-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Replaced:</span>
                  {result.replaced.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs text-green-600">
                      {p}
                    </Badge>
                  ))}
                </div>
              )}

              {result.unresolved.length > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="size-3 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Unresolved:</span>
                  {result.unresolved.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs text-amber-600">
                      {p}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InterpolationTester;
