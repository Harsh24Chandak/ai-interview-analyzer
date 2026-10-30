import React, { useRef, useState } from 'react';
import Button from './Button';

export default function FileUpload({
  onFileSelect,
  accept = '.pdf,.docx,.txt',
  maxSizeMB = 10,
  isLoading = false,
  selectedFilename = '',
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`rounded-[8px] border-2 border-dashed p-8 text-center transition-colors ${
        dragActive
          ? 'border-[#786BFF] bg-[#786BFF]/10'
          : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-hover)]'
      }`}
    >
      <div className="w-12 h-12 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-3 text-[var(--text-secondary)]">
        <span className="material-symbols-outlined text-[24px]">folder_special</span>
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        {selectedFilename ? `Selected: ${selectedFilename}` : 'Drag and drop your resume here, or browse files'}
      </h3>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        Supports PDF, DOCX, and TXT up to {maxSizeMB} MB. High-dimensional skill & experience extraction enabled.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && onFileSelect) onFileSelect(f);
        }}
        className="hidden"
      />
      <Button
        type="button"
        variant="primary"
        size="sm"
        isLoading={isLoading}
        materialIcon="add"
        onClick={() => inputRef.current?.click()}
      >
        Browse Files
      </Button>
    </div>
  );
}
