'use client'

import { useState, useRef } from 'react'
import { showToast } from '@/components/Toast'
import { MAX_IMAGE_SIZE, MAX_BASE64_SIZE } from '@/lib/constants'

// Image upload component with preview, multiple images, and delete
// Used for trade screenshots in both dashboard quick trade and account trade form

export function ImageUploader({
  images = [],
  onImagesChange,
  userId,
  accountId,
  maxImages = 5,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check max images limit
    if (images.length + files.length > maxImages) {
      showToast(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)
    const newImages = [...images]

    for (const file of files) {
      const url = await uploadImage(file)
      if (url) newImages.push(url)
    }

    onImagesChange(newImages)
    setUploading(false)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadImage = async (file) => {
    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      showToast(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
      return null
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPEG, PNG, GIF, etc.)')
      return null
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('accountId', accountId)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Storage upload failed')
      }

      const { url } = await response.json()
      return url
    } catch (err) {
      // Fallback to base64 only for small files
      if (file.size > MAX_BASE64_SIZE) {
        showToast('Upload failed and image is too large for fallback. Please try a smaller image (under 1MB).')
        return null
      }

      // Use base64 fallback for small images
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => {
          showToast('Failed to read image file')
          resolve(null)
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div>
      {/* Image previews */}
      {images.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {images.map((img, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #2a2a35'
              }}
            >
              <img
                src={img}
                alt={`Upload ${i + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '20px',
                  height: '20px',
                  background: 'rgba(239, 68, 68, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            style={{
              padding: '10px 16px',
              background: '#141418',
              border: '1px dashed #2a2a35',
              borderRadius: '8px',
              color: '#888',
              fontSize: '14px',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: disabled ? 0.5 : 1
            }}
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Add Image{images.length > 0 ? ` (${images.length}/${maxImages})` : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Single image input (simpler version)
export function SingleImageInput({
  value,
  onChange,
  userId,
  accountId,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    // Validate
    if (file.size > MAX_IMAGE_SIZE) {
      showToast('Image too large (max 5MB)')
      setUploading(false)
      return
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file')
      setUploading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('accountId', accountId)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const { url } = await response.json()
      onChange(url)
    } catch (err) {
      // Base64 fallback
      if (file.size <= MAX_BASE64_SIZE) {
        const reader = new FileReader()
        reader.onloadend = () => onChange(reader.result)
        reader.onerror = () => showToast('Failed to read image file')
        reader.readAsDataURL(file)
      } else {
        showToast('Upload failed. Try a smaller image.')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      {value ? (
        <div style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '8px'
        }}>
          <img
            src={value}
            alt="Upload"
            style={{
              maxWidth: '200px',
              maxHeight: '150px',
              borderRadius: '8px',
              border: '1px solid #2a2a35'
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '24px',
              height: '24px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '50%',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            style={{
              padding: '8px 12px',
              background: '#141418',
              border: '1px dashed #2a2a35',
              borderRadius: '6px',
              color: '#888',
              fontSize: '13px',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? 'Uploading...' : '+ Add Image'}
          </button>
        </>
      )}
    </div>
  )
}

export default ImageUploader
