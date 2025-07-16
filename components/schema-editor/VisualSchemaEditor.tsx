'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Save, Eye, Code } from 'lucide-react';

import { 
  SchemaEditorProps, 
  FieldDefinition, 
  ValidationSchema, 
  ContextSchema 
} from './types';
import { 
  extractFieldsFromSchema, 
  generateValidationSchema, 
  generateContextSchema,
  generateFieldId
} from './utils';
import FieldListManager from './FieldListManager';
import FieldEditor from './FieldEditor';
import OutputPanel from './OutputPanel';
import LivePreview from './LivePreview';

export default function VisualSchemaEditor({
  namespace,
  targetType: initialTargetType,
  validationSchema,
  contextSchema,
  availableTypes,
  onSave,
  onCancel,
  disabled = false
}: SchemaEditorProps) {
  const [targetType, setTargetType] = useState(initialTargetType || '');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Initialize fields from validation schema
  useEffect(() => {
    if (validationSchema) {
      const extractedFields = extractFieldsFromSchema(validationSchema, namespace);
      setFields(extractedFields);
    }
  }, [validationSchema, namespace]);

  // Generate schemas from current state
  const currentValidationSchema = useCallback(() => {
    if (!targetType.trim()) {
      return validationSchema || { 
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object' as const,
        properties: {},
        required: []
      };
    }
    return generateValidationSchema(fields, namespace, targetType);
  }, [fields, namespace, targetType, validationSchema]);

  const currentContextSchema = useCallback(() => {
    if (!targetType.trim()) {
      return contextSchema || { '@context': { '@protected': true } };
    }
    return generateContextSchema(fields, namespace, targetType);
  }, [fields, namespace, targetType, contextSchema]);

  const addField = () => {
    const newField: FieldDefinition = {
      id: generateFieldId(),
      name: `field${fields.length + 1}`,
      type: 'string',
      required: false,
      description: '',
      uiMetadata: {
        label: `Field ${fields.length + 1}`,
        order: fields.length
      }
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FieldDefinition>) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const reorderFields = (startIndex: number, endIndex: number) => {
    setFields(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const handleSave = () => {
    if (!targetType.trim()) {
      alert('Please enter a target type name');
      return;
    }

    const validation = currentValidationSchema();
    const context = currentContextSchema();
    onSave?.(validation, context);
  };

  const selectedField = selectedFieldId ? fields.find(f => f.id === selectedFieldId) : null;
  const existingFieldNames = fields.map(f => f.name);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="targetType">Content Type Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded">
                {namespace}:
              </span>
              <Input
                id="targetType"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                placeholder="e.g., Incident, Report, Organization"
                className="flex-1"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={disabled}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button onClick={handleSave} disabled={disabled || !targetType.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save Schema
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Resizable Layout */}
      <div className="flex-1 min-h-0">
        <div className="h-full">
          {/* Top Section: Fields List + Field Editor */}
          <div className="h-[600px]">
            <ResizablePanelGroup direction="horizontal" autoSaveId="schema-editor-horizontal">
              {/* Fields List Panel */}
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full bg-background">
                  <FieldListManager
                    fields={fields}
                    selectedFieldId={selectedFieldId}
                    onSelectField={setSelectedFieldId}
                    onAddField={addField}
                    onRemoveField={removeField}
                    onReorderFields={reorderFields}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Field Editor Panel */}
              <ResizablePanel defaultSize={70} minSize={50}>
                <div className="h-full bg-background">
                  <FieldEditor
                    field={selectedField}
                    namespace={namespace}
                    availableTypes={availableTypes}
                    onChange={(updates) => selectedField && updateField(selectedField.id, updates)}
                    existingFieldNames={existingFieldNames.filter(name => name !== selectedField?.name)}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Bottom Section: Preview/Output Panel */}
          <div className="h-96 border-t bg-background">
            <Tabs defaultValue="output" className="h-full flex flex-col">
              <div className="border-b px-4 pt-4">
                <TabsList>
                  <TabsTrigger value="preview">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="output">
                    <Code className="w-4 h-4 mr-2" />
                    Output
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="preview" className="flex-1 m-0">
                <LivePreview
                  schema={currentValidationSchema()}
                  namespace={namespace}
                  targetType={targetType}
                />
              </TabsContent>
              
              <TabsContent value="output" className="flex-1 m-0">
                <OutputPanel
                  validationSchema={currentValidationSchema()}
                  contextSchema={currentContextSchema()}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}