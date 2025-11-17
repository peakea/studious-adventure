import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

// Helper function to hash keys
function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// Helper function to get total topic count by author
function getTotalTopicCountByAuthor(author, callback) {
    db.get('SELECT COUNT(*) as count FROM topics WHERE author = ?', [author], callback);
}

// View topics by user
export const getUserTopics = (PAGE_SIZE) => async (req, res) => {
    try {
        const authorName = req.params.authorName;
        const currentPage = 1;
        const offset = (currentPage - 1) * PAGE_SIZE;

        getTotalTopicCountByAuthor(authorName, (err, row) => {
            if (err) {
                return res.status(500).render('error', {
                    statusCode: 500,
                    message: 'Database error',
                    details: 'Unable to retrieve topic count for this user. Please try again later.'
                });
            }

            const totalTopics = row.count;
            const totalPages = Math.ceil(totalTopics / PAGE_SIZE);

            db.all(
                'SELECT * FROM topics WHERE author = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [authorName, PAGE_SIZE, offset],
                (err, topics) => {
                    if (err) {
                        return res.status(500).render('error', {
                            statusCode: 500,
                            message: 'Database error',
                            details: 'Unable to retrieve topics for this user. Please try again later.'
                        });
                    }
                    res.render('user-topics', {
                        topics,
                        authorName,
                        currentPage,
                        totalPages
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            statusCode: 500,
            message: 'Error loading user topics',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};

// Paginated user topics
export const getUserTopicsPaginated = (PAGE_SIZE) => async (req, res) => {
    try {
        const authorName = req.params.authorName;
        const currentPage = parseInt(req.params.page) || 1;
        if (currentPage < 1) {
            return res.redirect(`/user/${authorName}`);
        }

        const offset = (currentPage - 1) * PAGE_SIZE;

        getTotalTopicCountByAuthor(authorName, (err, row) => {
            if (err) {
                return res.status(500).render('error', {
                    statusCode: 500,
                    message: 'Database error',
                    details: 'Unable to retrieve topic count for this user. Please try again later.'
                });
            }

            const totalTopics = row.count;
            const totalPages = Math.ceil(totalTopics / PAGE_SIZE);

            if (currentPage > totalPages && totalPages > 0) {
                return res.redirect(`/user/${authorName}/page/${totalPages}`);
            }

            db.all(
                'SELECT * FROM topics WHERE author = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [authorName, PAGE_SIZE, offset],
                (err, topics) => {
                    if (err) {
                        return res.status(500).render('error', {
                            statusCode: 500,
                            message: 'Database error',
                            details: 'Unable to retrieve topics for this user. Please try again later.'
                        });
                    }
                    res.render('user-topics', {
                        topics,
                        authorName,
                        currentPage,
                        totalPages
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            statusCode: 500,
            message: 'Error loading user topics',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};

// Sign up page - show captcha
export const getSignupPage = (captchaService, config) => async (req, res) => {
    try {
        // Check if registration is open
        if (!config.site.registrationOpen) {
            return res.status(403).render('error', {
                statusCode: 403,
                message: 'Registration Closed',
                details: 'User registration is currently closed. Please check back later or contact the administrator.'
            });
        }

        const captcha = await captchaService.generate();
        captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, (err) => {
            if (err) {
                return res.status(500).render('error', {
                    statusCode: 500,
                    message: 'Error generating captcha',
                    details: 'Unable to generate captcha. Please try again later.'
                });
            }
            res.render('signup', {
                captchaKey: captcha.key,
                captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                error: null
            });
        });
    } catch (error) {
        res.status(500).render('error', {
            statusCode: 500,
            message: 'Error loading signup page',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};

// Process signup
export const postSignup = (captchaService, config) => async (req, res) => {
    try {
        // Check if registration is open
        if (!config.site.registrationOpen) {
            return res.status(403).render('error', {
                statusCode: 403,
                message: 'Registration Closed',
                details: 'User registration is currently closed. Please check back later or contact the administrator.'
            });
        }

        const { authorName, captchaKey, captchaAnswer } = req.body;

        // Validate author name
        if (!authorName || authorName.trim().length < 3) {
            const captcha = await captchaService.generate();
            captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, (err) => {
                res.render('signup', {
                    captchaKey: captcha.key,
                    captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                    error: 'Author name must be at least 3 characters'
                });
            });
            return;
        }

        // Verify captcha exists
        if (!captchaKey || !captchaAnswer) {
            const captcha = await captchaService.generate();
            captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, (err) => {
                res.render('signup', {
                    captchaKey: captcha.key,
                    captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                    error: 'Please complete the captcha verification'
                });
            });
            return;
        }

        // Find and verify captcha
        captchaService.findCaptchaByKey(captchaKey, async (err, storedCaptcha) => {
            if (err || !storedCaptcha) {
                const captcha = await captchaService.generate();
                captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, () => {
                    res.render('signup', {
                        captchaKey: captcha.key,
                        captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                        error: 'Captcha not found or already used. Please try again.'
                    });
                });
                return;
            }

            // Check if expired
            if (captchaService.isExpired(storedCaptcha.created_at)) {
                captchaService.deleteCaptcha(captchaKey, async () => {
                    const captcha = await captchaService.generate();
                    captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, () => {
                        res.render('signup', {
                            captchaKey: captcha.key,
                            captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                            error: 'Captcha expired. Please try again.'
                        });
                    });
                });
                return;
            }

            // Verify answer
            if (!captchaService.verify(captchaAnswer, storedCaptcha.text)) {
                captchaService.deleteCaptcha(captchaKey, async () => {
                    const captcha = await captchaService.generate();
                    captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, () => {
                        res.render('signup', {
                            captchaKey: captcha.key,
                            captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                            error: 'Incorrect captcha. Please try again.'
                        });
                    });
                });
                return;
            }

            // Delete used captcha
            captchaService.deleteCaptcha(captchaKey, () => {
                // Check if author name is already taken
                db.get('SELECT * FROM users WHERE author_name = ?', [authorName.trim()], (err, existingUser) => {
                    if (err) {
                        return res.status(500).render('error', {
                            statusCode: 500,
                            message: 'Database error',
                            details: 'Unable to check username availability. Please try again later.'
                        });
                    }

                    if (existingUser) {
                        // Author name already exists
                        captchaService.generate().then(captcha => {
                            captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, () => {
                                res.render('signup', {
                                    captchaKey: captcha.key,
                                    captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                                    error: 'Author name already taken. Please choose a different name.'
                                });
                            });
                        });
                        return;
                    }

                    // Generate user key
                    const userId = uuidv4();
                    const userKey = crypto.randomBytes(16).toString('hex');
                    const keyHash = hashKey(userKey);

                    // Save to database
                    db.run(
                        'INSERT INTO users (id, author_name, key_hash) VALUES (?, ?, ?)',
                        [userId, authorName.trim(), keyHash],
                        function (err) {
                            if (err) {
                                console.error('Error creating user:', err);
                                return res.status(500).render('error', {
                                    statusCode: 500,
                                    message: 'Error creating user',
                                    details: 'Unable to create your account. Please try again later.'
                                });
                            }
                            res.render('signup-success', { userKey, authorName: authorName.trim() });
                        }
                    );
                });
            });
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).render('error', {
            statusCode: 500,
            message: 'Error processing signup',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};
