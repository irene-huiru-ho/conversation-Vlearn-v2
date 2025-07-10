// api/upload-media.js
import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename, fileData, fileType, fileSize } = req.body;
    
    if (!filename || !fileData || !fileType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    // Create unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${filename}`;
    
    // Upload image to Vercel Blob
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
      contentType: fileType,
    });

    // Create metadata object
    const metadata = {
      id: `${filename}_${timestamp}`,
      name: filename,
      url: blob.url,
      type: fileType,
      size: fileSize || buffer.length,
      uploadedAt: new Date().toISOString(),
      blobFilename: uniqueFilename,
    };

    // Store metadata as JSON file in blob storage
    const metadataBlob = await put(`metadata_${timestamp}_${filename}.json`, JSON.stringify(metadata), {
      access: 'public',
      contentType: 'application/json',
    });

    console.log('✅ File uploaded successfully:', metadata.name);

    res.status(200).json({ 
      success: true, 
      file: metadata 
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}