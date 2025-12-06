'use client'

import { useState, useRef } from 'react'

interface FileUploaderProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  existingFiles?: string[]
}

export default function FileUploader({
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 5,
  acceptedTypes = ['image/*'],
  existingFiles = []
}: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(existingFiles)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles = Array.from(selectedFiles)
    const validFiles = newFiles.filter(file => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar. Maksimal ${maxFileSize}MB.`)
        return false
      }
      // Check file type
      if (!acceptedTypes.some(type => file.type.match(type.replace('*', '.*')))) {
        alert(`File ${file.name} tidak didukung.`)
        return false
      }
      return true
    })

    const totalFiles = files.length + validFiles.length
    if (totalFiles > maxFiles) {
      alert(`Maksimal ${maxFiles} file.`)
      return
    }

    const updatedFiles = [...files, ...validFiles]
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
    onFilesChange(newFiles)
  }

  const removeExistingFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index)
    setPreviews(newPreviews)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Foto / Video Properti
      </label>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-600 mb-2">
          Klik untuk upload atau drag & drop file
        </p>
        <p className="text-sm text-gray-500">
          Maksimal {maxFiles} file, {maxFileSize}MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File Previews */}
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (index < existingFiles.length) {
                    removeExistingFile(index)
                  } else {
                    removeFile(index - existingFiles.length)
                  }
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500">
        {files.length + existingFiles.length} / {maxFiles} file dipilih
      </p>
    </div>
  )
}