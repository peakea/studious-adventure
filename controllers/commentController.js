import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import db from '../db.js';

// Helper function to hash keys
function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// Post a new comment
export const postComment = (req, res) => {
    const topicId = req.params.id;
    const { content, key, file_link, totp_secret } = req.body;

    // Validate required fields
    if (!content || !key) {
        return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
            if (err || !topic) {
                return res.status(404).render('error', {
                    statusCode: 404,
                    message: 'Topic not found',
                    details: 'The topic you are trying to comment on does not exist.'
                });
            }
            db.all(
                'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
                [topicId],
                (err, comments) => {
                    res.render('topic', {
                        topic,
                        comments: comments || [],
                        error: 'Content and key are required',
                        success: null
                    });
                }
            );
        });
    }

    // Hash the key
    const keyHash = hashKey(key);

    // Verify the key exists in the users table and get author name
    db.get('SELECT * FROM users WHERE key_hash = ?', [keyHash], (err, user) => {
        if (err) {
            return res.status(500).render('error', {
                statusCode: 500,
                message: 'Database error',
                details: 'Unable to verify your key. Please try again later.'
            });
        }

        if (!user) {
            return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
                if (err || !topic) {
                    return res.status(404).render('error', {
                        statusCode: 404,
                        message: 'Topic not found',
                        details: 'The topic you are trying to comment on does not exist.'
                    });
                }
                db.all(
                    'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
                    [topicId],
                    (err, comments) => {
                        res.render('topic', {
                            topic,
                            comments: comments || [],
                            error: 'Invalid key. Please <a href="/signup">sign up</a> first to get a valid key.',
                            success: null
                        });
                    }
                );
            });
        }

        // Get author name from user record
        const author = user.author_name;

        // Validate TOTP secret if provided
        let validatedSecret = null;
        if (totp_secret) {
            try {
                // Test if the secret is valid by trying to generate a token
                authenticator.generate(totp_secret);
                validatedSecret = totp_secret;
            } catch (e) {
                return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
                    if (err || !topic) {
                        return res.status(404).render('error', {
                            statusCode: 404,
                            message: 'Topic not found',
                            details: 'The topic you are trying to comment on does not exist.'
                        });
                    }
                    db.all(
                        'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
                        [topicId],
                        (err, comments) => {
                            res.render('topic', {
                                topic,
                                comments: comments || [],
                                error: 'Invalid TOTP secret format',
                                success: null
                            });
                        }
                    );
                });
            }
        }

        // Insert comment
        const commentId = uuidv4();
        db.run(
            'INSERT INTO comments (id, topic_id, author, content, key_hash, file_link, totp_secret) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [commentId, topicId, author, content, keyHash, file_link || null, validatedSecret],
            function (err) {
                if (err) {
                    return res.status(500).render('error', {
                        statusCode: 500,
                        message: 'Error posting comment',
                        details: 'Unable to save your comment. Please try again later.'
                    });
                }

                // Redirect back to topic page
                res.redirect(`/topic/${topicId}`);
            }
        );
    });
};
