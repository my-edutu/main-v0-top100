'use client'

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, Loader2, ArrowLeft } from 'lucide-react';

export default function AwardeesImport() {
  // For development, we're skipping auth
  // In production, you would use session management
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        toast.success(`Selected file: ${selectedFile.name}`);
      } else {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select an Excel file first');
      return;
    }

    setIsProcessing(true);
    try {
      toast.loading('Processing awardees...', { id: 'import-awardees' });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/awardees/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message, { id: 'import-awardees' });
        setFile(null);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Redirect back to the main awardees page after successful import
        setTimeout(() => {
          router.push('/admin/awardees');
        }, 1500);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error importing awardees:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import awardees', { id: 'import-awardees' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownloadTemplate = () => {
    // In a real app, this would download a template file
    // For now, we'll link to the existing file
    const link = document.createElement('a');
    link.href = '/top100 Africa future Leaders 2025.xlsx';
    link.download = 'top100_Africa_future_Leaders_2025_template.xlsx';
    link.click();
    toast.success('Template download started');
  };

  // For development, we're not checking authentication
  // In production, implement proper auth check

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/admin/awardees')}
              className="p-0 mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <CardTitle>Import Awardees via Excel</CardTitle>
          <CardDescription>
            Upload an Excel file to bulk import awardee data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">How to import awardees</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Download the Excel template below</li>
                <li>Fill in the awardee data in the required format</li>
                <li>Upload your completed Excel file</li>
                <li>Verify the data and confirm import</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Download Template</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download our Excel template to ensure your data is in the correct format.
              </p>
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Excel Template
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Upload File</h3>
              <div className="space-y-3">
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={handleFileUploadClick}
                  className="w-full justify-start"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {file ? file.name : 'Select Excel File (.xlsx or .xls)'}
                </Button>
                
                {file && (
                  <div className="p-3 bg-secondary rounded border">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-5 w-5 mr-2 text-green-500" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.size > 1024 ? `${(file.size / 1024).toFixed(2)} KB` : `${file.size} bytes`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h4 className="font-medium text-blue-900 mb-2">Required Columns</h4>
              <p className="text-sm text-blue-800 mb-2">
                Your Excel file should include these columns (column names are flexible):
              </p>
              <ul className="grid grid-cols-2 gap-1 text-sm text-blue-800">
                <li>• name (required)</li>
                <li>• email</li>
                <li>• country</li>
                <li>• course</li>
                <li>• cgpa</li>
                <li>• bio</li>
                <li>• year</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/awardees')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Awardees
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}