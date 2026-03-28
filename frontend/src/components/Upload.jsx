import React, { useState, useRef, useCallback } from "react";
import { Upload as UploadIcon, FileImage, X, FileText, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";
import { cn } from "../lib/utils";
import { uploadDiagram, createStudy } from "../lib/api";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];

export function UploadComponent({ onUploadComplete, onStudyCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [studyName, setStudyName] = useState("");
  const [processType, setProcessType] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("upload"); // "upload" or "manual"
  const fileInputRef = useRef(null);

  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Invalid file type. Please upload PNG, JPG, or PDF files.");
      return false;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50MB.");
      return false;
    }
    return true;
  };

  const handleFile = useCallback((f) => {
    setError(null);
    if (!validateFile(f)) return;

    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartAnalysis = async () => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let studyData;

      if (mode === "upload" && file) {
        setUploadProgress(30);
        studyData = await uploadDiagram(file, description);
        setUploadProgress(70);
      } else if (mode === "manual" && description.trim()) {
        setUploadProgress(30);
        studyData = await createStudy(
          studyName || "New HAZOP Study",
          description,
          processType || "general"
        );
        setUploadProgress(70);
      } else {
        setError("Please upload a file or provide a process description.");
        setIsUploading(false);
        return;
      }

      setUploadProgress(100);

      if (onUploadComplete) onUploadComplete(studyData);
      if (onStudyCreated) onStudyCreated(studyData);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
          size="sm"
        >
          <FileImage className="mr-2 h-4 w-4" />
          Upload Diagram
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          size="sm"
        >
          <FileText className="mr-2 h-4 w-4" />
          Manual Description
        </Button>
      </div>

      {mode === "upload" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload PFD / P&ID Diagram</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <UploadIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Drag and drop your diagram here
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports PNG, JPG, PDF (max 50MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {preview && (
                  <div className="rounded-lg border overflow-hidden">
                    <img
                      src={preview}
                      alt="Diagram preview"
                      className="w-full max-h-64 object-contain bg-muted/30"
                    />
                  </div>
                )}
              </div>
            )}

            <Textarea
              placeholder="Optional: Describe the process or add context for the analysis..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Describe Your Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Study name (e.g., Distillation Column HAZOP)"
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
            />
            <Input
              placeholder="Process type (e.g., chemical reactor, distillation, storage)"
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
            />
            <Textarea
              placeholder="Describe the process in detail: equipment, operating conditions, materials, flow paths, control systems..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {uploadProgress < 30
              ? "Preparing..."
              : uploadProgress < 70
              ? "Uploading and processing..."
              : "Finalizing..."}
          </p>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleStartAnalysis}
        disabled={isUploading || (mode === "upload" && !file) || (mode === "manual" && !description.trim())}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <UploadIcon className="mr-2 h-4 w-4" />
            Start Analysis
          </>
        )}
      </Button>
    </div>
  );
}

export default UploadComponent;
