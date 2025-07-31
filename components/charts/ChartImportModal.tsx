'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { validateChartConfig, ExportedChartConfig } from '@/lib/charts/exportImport';

interface ChartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (config: ExportedChartConfig) => void;
}

export default function ChartImportModal({ isOpen, onClose, onImport }: ChartImportModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; error?: string; data?: ExportedChartConfig } | null>(null);

  const handleValidate = () => {
    if (!jsonInput.trim()) {
      setValidationResult({ isValid: false, error: 'Please paste a chart configuration' });
      return;
    }

    const result = validateChartConfig(jsonInput);
    setValidationResult(result);
  };

  const handleImport = () => {
    if (validationResult?.isValid && validationResult.data) {
      onImport(validationResult.data);
      handleClose();
    }
  };

  const handleClose = () => {
    setJsonInput('');
    setValidationResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Chart Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="json-input">Paste Chart Configuration JSON</Label>
            <Textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setValidationResult(null);
              }}
              placeholder="Paste your exported chart configuration here..."
              className="h-64 font-mono text-sm"
            />
          </div>

          {validationResult && (
            <Alert variant={validationResult.isValid ? "default" : "destructive"}>
              {validationResult.isValid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {validationResult.isValid 
                  ? "Valid chart configuration" 
                  : validationResult.error || "Invalid configuration"}
              </AlertDescription>
            </Alert>
          )}

          {validationResult?.isValid && validationResult.data && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Title:</span> {validationResult.data.title}
                  </div>
                  <div>
                    <span className="font-medium">Chart Type:</span> {validationResult.data.chartType}
                  </div>
                  <div>
                    <span className="font-medium">Entity Type:</span> {validationResult.data.builderState.selectedEntityType}
                  </div>
                  <div>
                    <span className="font-medium">Grouping Field:</span> {validationResult.data.builderState.selectedGrouping?.fieldName}
                  </div>
                  {validationResult.data.exportedAt && (
                    <div>
                      <span className="font-medium">Exported:</span> {new Date(validationResult.data.exportedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!validationResult && (
            <Button onClick={handleValidate}>
              Validate
            </Button>
          )}
          {validationResult?.isValid && (
            <Button onClick={handleImport}>
              Import Chart
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}