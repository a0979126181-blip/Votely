const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// Initialize Cloud Storage
// In Cloud Run, credentials are automatically provided via service account
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'votely-videos';

let bucket;

// Initialize bucket
const initBucket = async () => {
    try {
        bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();

        if (!exists) {
            console.log(`Bucket ${bucketName} does not exist. Creating...`);
            await storage.createBucket(bucketName, {
                location: 'ASIA-EAST1',
                storageClass: 'STANDARD'
            });
            console.log(`Bucket ${bucketName} created.`);
        }

        // Configure CORS
        // Allow all origins and headers to prevent browser blocking
        const corsConfiguration = [
            {
                maxAgeSeconds: 3600,
                method: ['PUT', 'GET', 'HEAD', 'DELETE', 'POST', 'OPTIONS'],
                origin: ['*'],
                responseHeader: ['*'], // Allow all response headers
            },
        ];
        await bucket.setCorsConfiguration(corsConfiguration);
        console.log('✅ Bucket CORS configured with permissive policy');

    } catch (error) {
        console.error('Error initializing Cloud Storage:', error);
        // Fallback to local storage for development
        console.warn('Using local filesystem for video storage');
    }
};

// Upload video to Cloud Storage
const uploadVideo = async (file) => {
    // If bucket not initialized, save locally
    if (!bucket) {
        console.log('📁 Using local storage (GCS bucket not available)');
        const localDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
        }
        const localPath = path.join(localDir, file.filename);
        fs.renameSync(file.path, localPath);
        console.log('✅ Video saved locally:', localPath);
        return `/uploads/${file.filename}`;
    }

    // Try to upload to GCS, fallback to local on error
    try {
        console.log('☁️ Attempting upload to GCS...');
        const destination = `videos/${file.filename}`;
        await bucket.upload(file.path, {
            destination,
            metadata: {
                contentType: file.mimetype,
            }
        });

        // Delete temp file
        fs.unlinkSync(file.path);
        console.log('✅ Video uploaded to GCS:', destination);

        // Return public URL
        return `https://storage.googleapis.com/${bucketName}/${destination}`;
    } catch (error) {
        console.error('❌ GCS upload failed, falling back to local storage:', error.message);

        // Fallback to local storage
        const localDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
        }
        const localPath = path.join(localDir, file.filename);

        // Move file from temp to uploads
        if (fs.existsSync(file.path)) {
            fs.renameSync(file.path, localPath);
        }

        console.log('✅ Video saved locally (fallback):', localPath);
        return `/uploads/${file.filename}`;
    }
};

// Delete video from Cloud Storage
const deleteVideo = async (videoPath) => {
    if (!bucket) {
        // Local filesystem
        const localPath = path.join(__dirname, videoPath);
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }
        return;
    }

    // Extract filename from URL
    const filename = videoPath.split('/').pop();
    const file = bucket.file(`videos/${filename}`);

    try {
        await file.delete();
    } catch (error) {
        console.error('Error deleting video from GCS:', error);
    }
};

// Generate signed URL for direct client upload
const generateSignedUrl = async (filename, contentType) => {
    if (!bucket) {
        throw new Error('GCS bucket not initialized');
    }

    const file = bucket.file(`videos/${filename}`);
    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: contentType,
    });

    return url;
};

// Get public URL for a filename
const getPublicUrl = (filename) => {
    if (!bucket) {
        return `/uploads/${filename}`;
    }
    return `https://storage.googleapis.com/${bucketName}/videos/${filename}`;
};

module.exports = { initBucket, uploadVideo, deleteVideo, generateSignedUrl, getPublicUrl };
