const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./database');
const { initBucket, uploadVideo, deleteVideo, generateUploadUrl, getPublicUrl } = require('./storage');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist'))); // Serve React build
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve local videos

// Configure multer for file uploads
const upload = multer({
    dest: path.join(__dirname, '../temp/'),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only MP4, WebM, and MOV are allowed.'));
        }
    }
});

// Initialize Cloud Storage
initBucket().catch(console.error);

// ===== API Routes ====

// Get all videos
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await db.getAllVideos();
        res.json(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Get upload URL for direct GCS upload
app.get('/api/upload-url', async (req, res) => {
    try {
        const { filename, contentType } = req.query;
        if (!filename || !contentType) {
            return res.status(400).json({ error: 'Missing filename or contentType' });
        }

        // Make filename unique
        const ext = path.extname(filename);
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;

        console.log(`🔗 Generating upload URL for ${uniqueFilename} (${contentType})`);
        const url = await generateUploadUrl(uniqueFilename, contentType);
        console.log('✅ Upload URL generated successfully');

        res.json({ url, filename: uniqueFilename });
    } catch (error) {
        console.error('❌ Error generating upload URL:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Failed to generate upload URL', details: error.message });
    }
});

// Upload new video (supports both direct GCS upload and multipart upload)
app.post('/api/videos', (req, res, next) => {
    if (req.is('application/json')) return next();
    upload.single('video')(req, res, next);
}, async (req, res) => {
    try {
        console.log('📤 Upload request received');

        let videoPath;
        let title, description, uploaderId, uploaderName, thumbnailUrl;

        if (req.is('application/json')) {
            console.log('Mode: Direct GCS Upload (JSON)');
            const body = req.body;
            title = body.title;
            description = body.description;
            uploaderId = body.uploaderId;
            uploaderName = body.uploaderName;
            thumbnailUrl = body.thumbnailUrl;

            if (!body.videoFilename) {
                return res.status(400).json({ error: 'Missing videoFilename' });
            }
            videoPath = getPublicUrl(body.videoFilename);
        } else {
            console.log('Mode: Server Proxy Upload (Multipart)');
            console.log('File:', req.file ? 'Present' : 'Missing');

            if (!req.file) {
                console.error('❌ No file in request');
                return res.status(400).json({ error: 'No video file provided' });
            }

            const body = req.body;
            title = body.title;
            description = body.description;
            uploaderId = body.uploaderId;
            uploaderName = body.uploaderName;
            thumbnailUrl = body.thumbnailUrl;

            // Rename file with unique name
            const ext = path.extname(req.file.originalname);
            const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
            const tempDir = path.join(__dirname, '../temp');
            const newPath = path.join(tempDir, filename);

            console.log('📁 Renaming file:', req.file.path, '→', newPath);
            fs.renameSync(req.file.path, newPath);
            req.file.path = newPath;
            req.file.filename = filename;

            // Upload to Cloud Storage
            console.log('☁️ Uploading to storage...');
            videoPath = await uploadVideo(req.file);
            console.log('✅ Upload complete:', videoPath);
        }

        if (!title || !uploaderId || !uploaderName) {
            console.error('❌ Missing required fields:', { title, uploaderId, uploaderName });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create video record
        const video = {
            id: `v-${Date.now()}`,
            title,
            description: description || '',
            videoPath,
            thumbnailUrl: thumbnailUrl || '',
            uploaderId,
            uploaderName,
            createdAt: Date.now(),
            isHidden: false
        };

        await db.createVideo(video);
        console.log('💾 Video saved to database:', video.id);

        // Return video with full URL
        res.json({
            ...video,
            videoUrl: videoPath
        });
    } catch (error) {
        console.error('❌ Error uploading video:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Failed to upload video', details: error.message });
    }
});

// Toggle video visibility
app.patch('/api/videos/:id/visibility', async (req, res) => {
    try {
        const { id } = req.params;
        const { isHidden } = req.body;

        await db.updateVideoVisibility(id, isHidden);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating visibility:', error);
        res.status(500).json({ error: 'Failed to update visibility' });
    }
});

// Delete video
app.delete('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const video = await db.getVideoById(id);

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Delete from Cloud Storage
        await deleteVideo(video.videoPath);

        // Delete from database
        await db.deleteVideo(id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// Get all votes
app.get('/api/votes', async (req, res) => {
    try {
        const votes = await db.getAllVotes();
        res.json(votes);
    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).json({ error: 'Failed to fetch votes' });
    }
});

// Cast vote
app.post('/api/votes', async (req, res) => {
    try {
        const { userId, videoId, userEmail } = req.body;

        if (!userId || !videoId) {
            return res.status(400).json({ error: 'Missing userId or videoId' });
        }

        await db.castVote(userId, videoId, userEmail);
        res.json({ success: true });
    } catch (error) {
        console.error('Error casting vote:', error);
        res.status(500).json({ error: 'Failed to cast vote' });
    }
});

// Remove vote
app.delete('/api/votes/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await db.removeVote(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing vote:', error);
        res.status(500).json({ error: 'Failed to remove vote' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 API available at http://localhost:${PORT}/api/`);
    console.log(`📊 Frontend: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing database...');
    db.close();
    process.exit(0);
});
