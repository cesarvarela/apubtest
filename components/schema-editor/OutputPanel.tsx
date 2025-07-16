'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download, FileJson } from 'lucide-react';

import { OutputPanelProps } from './types';

export default function OutputPanel({
  validationSchema,
  contextSchema
}: OutputPanelProps) {
  const [copiedItem, setCopiedItem] = useState<'validation' | 'context' | null>(null);

  const copyToClipboard = async (text: string, type: 'validation' | 'context') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validationJson = JSON.stringify(validationSchema, null, 2);
  const contextJson = JSON.stringify(contextSchema, null, 2);

  const getSchemaStats = () => {
    const fieldCount = Object.keys(validationSchema.properties || {}).length - 3; // Subtract @context, @type, @id
    const requiredCount = (validationSchema.required || []).length - 2; // Subtract @type, @id
    return { fieldCount, requiredCount };
  };

  const { fieldCount, requiredCount } = getSchemaStats();

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      
      {/* Schema Statistics */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {fieldCount} fields
          </Badge>
          <Badge variant="outline" className="text-xs">
            {requiredCount} required
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadJson(validationSchema, 'validation-schema.json')}
            className="h-7 px-2"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadJson(contextSchema, 'context-schema.jsonld')}
            className="h-7 px-2"
          >
            <FileJson className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Validation Schema */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">JSON Schema (Validation)</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(validationJson, 'validation')}
              className="h-7 px-2"
            >
              {copiedItem === 'validation' ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-3">
          <pre className="text-xs overflow-auto h-full bg-muted/30 p-3 rounded border font-mono">
            {validationJson}
          </pre>
        </CardContent>
      </Card>
      
      {/* Context Schema */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">JSON-LD Context</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(contextJson, 'context')}
              className="h-7 px-2"
            >
              {copiedItem === 'context' ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-3">
          <pre className="text-xs overflow-auto h-full bg-muted/30 p-3 rounded border font-mono">
            {contextJson}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}