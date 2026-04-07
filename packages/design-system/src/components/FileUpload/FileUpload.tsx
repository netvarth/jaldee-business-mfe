import { useRef, useState }    from "react";
import { cn }                  from "../../utils";

export interface FileUploadProps {
  label?:    string;
  accept?:   string;
  multiple?: boolean;
  maxSize?:  number;
  onUpload:  (files: File[]) => void;
  error?:    string;
  className?: string;
}

export function FileUpload({
  label, accept, multiple, maxSize, onUpload, error, className
}: FileUploadProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files,    setFiles]    = useState<File[]>([]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const arr = Array.from(fileList);

    if (maxSize) {
      const oversized = arr.filter(f => f.size > maxSize);
      if (oversized.length > 0) return;
    }

    setFiles(arr);
    onUpload(arr);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-testid="file-upload">
      {label && (
        <span className="ds-form-label">{label}</span>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
          "transition-colors duration-150",
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-2xl text-gray-400 mb-2">📎</div>
        <p className="text-sm text-gray-600 m-0">
          <span className="text-indigo-600 font-medium">Click to upload</span>
          {" "}or drag and drop
        </p>
        {maxSize && (
          <p className="text-xs text-gray-400 mt-1 m-0">
            Max size: {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-3 py-1.5">
              <span>📄</span>
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
