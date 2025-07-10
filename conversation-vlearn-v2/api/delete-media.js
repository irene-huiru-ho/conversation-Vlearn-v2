// api/delete-media.js
import { del, list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.query;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    console.log(`🗑️ Attempting to delete file with ID: ${fileId}`);

    // List all blobs to find the ones to delete
    const { blobs } = await list();
    
    // Extract timestamp from fileId (format: filename_timestamp)
    const timestampMatch = fileId.match(/_(\d+)$/);
    if (!timestampMatch) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }
    const timestamp = timestampMatch[1];
    
    // Find metadata file for this timestamp
    const metadataFile = blobs.find(blob => 
      blob.pathname.startsWith(`metadata_${timestamp}_`) && 
      blob.pathname.endsWith('.json')
    );

    if (!metadataFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get metadata to find the actual image file
    const metadataResponse = await fetch(metadataFile.url);
    const metadata = await metadataResponse.json();

    console.log(`📄 Found metadata for: ${metadata.name}`);

    // Find and delete the actual image file
    const imageFile = blobs.find(blob => blob.pathname === metadata.blobFilename);
    
    // Delete both files
    const deletePromises = [];
    if (imageFile) {
      console.log(`🖼️ Deleting image file: ${imageFile.pathname}`);
      deletePromises.push(del(imageFile.url));
    }
    console.log(`📋 Deleting metadata file: ${metadataFile.pathname}`);
    deletePromises.push(del(metadataFile.url));

    await Promise.all(deletePromises);

    console.log(`✅ Successfully deleted file: ${metadata.name}`);

    res.status(200).json({ 
      success: true, 
      message: 'File deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
}