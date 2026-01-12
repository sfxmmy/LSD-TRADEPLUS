import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Create client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    const accountId = formData.get('accountId')

    if (!file || !userId || !accountId) {
      console.error('Missing fields:', { file: !!file, userId, accountId })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Server-side validation
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.` }, { status: 400 })
    }

    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Create unique filename
    const timestamp = Date.now()
    const ext = file.name?.split('.').pop() || 'png'
    const filename = `${userId}/${accountId}/${timestamp}.${ext}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Uploading to storage:', { filename, size: buffer.length, type: file.type })

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('trade-images')
      .upload(filename, buffer, {
        contentType: file.type || 'image/png',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('trade-images')
      .getPublicUrl(filename)

    console.log('Upload success:', urlData.publicUrl)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
