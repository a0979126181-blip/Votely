const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'votely',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Initialize pool
const pool = mysql.createPool(dbConfig);

// Initialize database tables
const init = async () => {
    try {
        const connection = await pool.getConnection();
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS videos (
                    id VARCHAR(255) PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    videoPath TEXT NOT NULL,
                    thumbnailUrl TEXT NOT NULL,
                    uploaderId VARCHAR(255) NOT NULL,
                    uploaderName VARCHAR(255) NOT NULL,
                    createdAt BIGINT NOT NULL,
                    isHidden TINYINT(1) DEFAULT 0
                )
            `);

            await connection.query(`
                CREATE TABLE IF NOT EXISTS votes (
                    userId VARCHAR(255) PRIMARY KEY,
                    videoId VARCHAR(255) NOT NULL,
                    userEmail VARCHAR(255),
                    timestamp BIGINT NOT NULL
                )
            `);

            // Migration: Add userEmail column if it doesn't exist
            try {
                await connection.query('ALTER TABLE votes ADD COLUMN userEmail VARCHAR(255)');
                console.log('✅ Added userEmail column to votes table');
            } catch (err) {
                // Ignore error if column already exists
                if (err.code !== 'ER_DUP_FIELDNAME') {
                    console.log('ℹ️ userEmail column likely already exists or other error:', err.message);
                }
            }
            console.log('✅ Database tables initialized');
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        // Don't exit process here, let the main application handle it or retry
    }
};

// Initialize immediately
init();

module.exports = {
    // Videos
    getAllVideos: async () => {
        const [rows] = await pool.query('SELECT * FROM videos ORDER BY createdAt DESC');
        return rows.map(v => ({
            ...v,
            isHidden: Boolean(v.isHidden)
        }));
    },

    getVideoById: async (id) => {
        const [rows] = await pool.query('SELECT * FROM videos WHERE id = ?', [id]);
        const video = rows[0];
        if (video) {
            video.isHidden = Boolean(video.isHidden);
        }
        return video;
    },

    createVideo: async (video) => {
        await pool.query(
            `INSERT INTO videos (id, title, description, videoPath, thumbnailUrl, uploaderId, uploaderName, createdAt, isHidden)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                video.id,
                video.title,
                video.description || '',
                video.videoPath,
                video.thumbnailUrl,
                video.uploaderId,
                video.uploaderName,
                video.createdAt,
                video.isHidden ? 1 : 0
            ]
        );
        return video;
    },

    updateVideoVisibility: async (id, isHidden) => {
        await pool.query('UPDATE videos SET isHidden = ? WHERE id = ?', [isHidden ? 1 : 0, id]);
    },

    deleteVideo: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete related votes first
            await connection.query('DELETE FROM votes WHERE videoId = ?', [id]);
            // Delete video
            await connection.query('DELETE FROM videos WHERE id = ?', [id]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Votes
    getAllVotes: async () => {
        const [rows] = await pool.query('SELECT * FROM votes');
        // Convert to { userId: { videoId, userEmail } } format
        return rows.reduce((acc, vote) => {
            acc[vote.userId] = {
                videoId: vote.videoId,
                userEmail: vote.userEmail
            };
            return acc;
        }, {});
    },

    castVote: async (userId, videoId, userEmail) => {
        // Using INSERT ... ON DUPLICATE KEY UPDATE for MySQL equivalent of INSERT OR REPLACE
        // Or just REPLACE INTO if we don't care about overhead, but ON DUPLICATE is usually better.
        // However, the original logic was INSERT OR REPLACE.
        // Let's use REPLACE INTO for simplicity and matching behavior.
        await pool.query('REPLACE INTO votes (userId, videoId, userEmail, timestamp) VALUES (?, ?, ?, ?)', [userId, videoId, userEmail, Date.now()]);
    },

    removeVote: async (userId) => {
        await pool.query('DELETE FROM votes WHERE userId = ?', [userId]);
    },

    // Cleanup
    close: async () => {
        await pool.end();
    }
};
