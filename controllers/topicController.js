import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import db from '../db.js';

// Helper function to hash keys
function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// View a specific topic with its comments
export const getTopic = (req, res) => {
    const topicId = req.params.id;

    db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
        if (err || !topic) {
            return res.status(404).render('error', {
                statusCode: 404,
                message: 'Topic not found',
                details: 'The topic you are looking for does not exist.'
            });
        }

        db.all(
            'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
            [topicId],
            (err, comments) => {
                if (err) {
                    return res.status(500).render('error', {
                        statusCode: 500,
                        message: 'Database error',
                        details: 'Unable to retrieve comments. Please try again later.'
                    });
                }

                // Generate current TOTP codes for comments with secrets
                comments = comments.map(comment => {
                    if (comment.totp_secret) {
                        try {
                            comment.current_totp = authenticator.generate(comment.totp_secret);
                        } catch (e) {
                            comment.current_totp = 'Invalid secret';
                        }
                    }
                    return comment;
                });

                res.render('topic', { topic, comments, error: null, success: null });
            }
        );
    });
};

// Delete topic form
export const getDeleteTopic = (req, res) => {
    const topicId = req.params.id;

    db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
        if (err || !topic) {
            return res.status(404).render('error', {
                statusCode: 404,
                message: 'Topic not found',
                details: 'The topic you are trying to delete does not exist.'
            });
        }
        res.render('delete-topic', { topic, error: null });
    });
};

// Delete topic
export const postDeleteTopic = (req, res) => {
    const topicId = req.params.id;
    const { key } = req.body;

    if (!key) {
        return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
            if (err || !topic) {
                return res.status(404).render('error', {
                    statusCode: 404,
                    message: 'Topic not found',
                    details: 'The topic you are trying to delete does not exist.'
                });
            }
            res.render('delete-topic', { topic, error: 'Key is required' });
        });
    }

    const keyHash = hashKey(key);

    // Get the topic to verify ownership
    db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
        if (err || !topic) {
            return res.status(404).render('error', {
                statusCode: 404,
                message: 'Topic not found',
                details: 'The topic you are trying to delete does not exist.'
            });
        }

        // Verify the key matches the topic creator's key
        if (topic.key_hash !== keyHash) {
            return res.render('delete-topic', {
                topic,
                error: 'Invalid key. Only the topic creator can delete this topic.'
            });
        }

        // Delete all comments associated with the topic
        db.run('DELETE FROM comments WHERE topic_id = ?', [topicId], (err) => {
            if (err) {
                console.error('Error deleting comments:', err);
                return res.status(500).render('error', {
                    statusCode: 500,
                    message: 'Error deleting topic',
                    details: 'Unable to delete comments. Please try again later.'
                });
            }

            // Delete the topic
            db.run('DELETE FROM topics WHERE id = ?', [topicId], (err) => {
                if (err) {
                    console.error('Error deleting topic:', err);
                    return res.status(500).render('error', {
                        statusCode: 500,
                        message: 'Error deleting topic',
                        details: 'Unable to delete the topic. Please try again later.'
                    });
                }

                res.redirect('/?deleted=true');
            });
        });
    });
};

// Create a new topic
export const postCreateTopic = (captchaService) => async (req, res) => {
    try {
        const { title, key, captchaKey, captchaAnswer } = req.body;

        if (!title || !key) {
            return res.redirect('/');
        }

        // Verify captcha
        if (!captchaKey || !captchaAnswer) {
            return res.redirect('/');
        }

        // Hash the key and verify user
        const keyHash = hashKey(key);

        db.get('SELECT * FROM users WHERE key_hash = ?', [keyHash], (err, user) => {
            if (err) {
                return res.status(500).render('error', {
                    statusCode: 500,
                    message: 'Database error',
                    details: 'Unable to verify your key. Please try again later.'
                });
            }

            if (!user) {
                // Invalid key - redirect back
                return res.redirect('/');
            }

            captchaService.findCaptchaByKey(captchaKey, async (err, storedCaptcha) => {
                if (err || !storedCaptcha || captchaService.isExpired(storedCaptcha.created_at) ||
                    !captchaService.verify(captchaAnswer, storedCaptcha.text)) {
                    captchaService.deleteCaptcha(captchaKey, () => { });
                    return res.redirect('/');
                }

                // Delete used captcha
                captchaService.deleteCaptcha(captchaKey, () => { });

                // Create topic with author and key_hash
                const topicId = uuidv4();
                const author = user.author_name;
                db.run(
                    'INSERT INTO topics (id, title, author, key_hash) VALUES (?, ?, ?, ?)',
                    [topicId, title, author, keyHash],
                    function (err) {
                        if (err) {
                            return res.status(500).render('error', {
                                statusCode: 500,
                                message: 'Error creating topic',
                                details: 'Unable to create your topic. Please try again later.'
                            });
                        }
                        res.redirect(`/topic/${topicId}`);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Topic creation error:', error);
        res.redirect('/');
    }
};
