const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path (will be on GCS FUSE mount in Cloud Run)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'votely.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance for concurrent access

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    videoPath TEXT NOT NULL,
    thumbnailUrl TEXT NOT NULL,
    uploaderId TEXT NOT NULL,
    uploaderName TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    isHidden INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS votes (
    userId TEXT PRIMARY KEY,
    videoId TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

// Video operations
const videoQueries = {
    getAll: db.prepare('SELECT * FROM videos ORDER BY createdAt DESC'),
    getById: db.prepare('SELECT * FROM videos WHERE id = ?'),
    insert: db.prepare(`
    INSERT INTO videos (id, title, description, videoPath, thumbnailUrl, uploaderId, uploaderName, createdAt, isHidden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
    updateVisibility: db.prepare('UPDATE videos SET isHidden = ? WHERE id = ?'),
    delete: db.prepare('DELETE FROM videos WHERE id = ?')
};

// Vote operations
const voteQueries = {
    getAll: db.prepare('SELECT * FROM votes'),
    getByUser: db.prepare('SELECT * FROM votes WHERE userId = ?'),
    insert: db.prepare('INSERT OR REPLACE INTO votes (userId, videoId, timestamp) VALUES (?, ?, ?)'),
    delete: db.prepare('DELETE FROM votes WHERE userId = ?'),
    deleteByVideo: db.prepare('DELETE FROM votes WHERE videoId = ?')
};

module.exports = {
    // Videos
    getAllVideos: () => videoQueries.getAll.all().map(v => ({
        ...v,
        isHidden: Boolean(v.isHidden)
    })),

    getVideoById: (id) => {
        const video = videoQueries.getById.get(id);
        if (video) {
            video.isHidden = Boolean(video.isHidden);
        }
        return video;
    },

    createVideo: (video) => {
        videoQueries.insert.run(
            video.id,
            video.title,
            video.description || '',
            video.videoPath,
            video.thumbnailUrl,
            video.uploaderId,
            video.uploaderName,
            video.createdAt,
            video.isHidden ? 1 : 0
        );
        return video;
    },

    updateVideoVisibility: (id, isHidden) => {
        videoQueries.updateVisibility.run(isHidden ? 1 : 0, id);
    },

    deleteVideo: (id) => {
        // Delete video and related votes
        voteQueries.deleteByVideo.run(id);
        videoQueries.delete.run(id);
    },

    // Votes
    getAllVotes: () => {
        const votes = voteQueries.getAll.all();
        // Convert to { userId: videoId } format
        return votes.reduce((acc, vote) => {
            acc[vote.userId] = vote.videoId;
            return acc;
        }, {});
    },

    castVote: (userId, videoId) => {
        voteQueries.insert.run(userId, videoId, Date.now());
    },

    removeVote: (userId) => {
        voteQueries.delete.run(userId);
    },

    // Cleanup
    close: () => db.close()
};
