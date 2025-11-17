import db from '../db.js';

/**
 * Captcha Model - handles database operations for captchas
 */
function createCaptchaModel() {
    return {
        // Create a captcha record
        create: (key, text, createdAt, callback) => {
            db.run(
                'INSERT INTO captchas (key, text, created_at) VALUES (?, ?, ?)',
                [key, text, createdAt],
                callback
            );
        },

        // Find a captcha by key
        findByKey: (key, callback) => {
            db.get('SELECT * FROM captchas WHERE key = ?', [key], callback);
        },

        // Delete a captcha after it's been used
        delete: (key, callback) => {
            db.run('DELETE FROM captchas WHERE key = ?', [key], callback);
        },

        // Clean up expired captchas based on creation time and expiry duration
        cleanExpired: (expiryMs, callback) => {
            const cutoffTime = Date.now() - expiryMs;
            db.run('DELETE FROM captchas WHERE created_at < ?', [cutoffTime], function(err) {
                if (callback) {
                    callback(err, this.changes || 0);
                }
            });
        },

        // Get count of captchas (for debugging/monitoring)
        count: (callback) => {
            db.get('SELECT COUNT(*) as count FROM captchas', [], (err, result) => {
                if (callback) {
                    callback(err, result ? result.count : 0);
                }
            });
        }
    };
}

export default createCaptchaModel;
