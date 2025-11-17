import db from '../db.js';

// Helper function to get total topic count
function getTotalTopicCount(callback) {
    db.get('SELECT COUNT(*) as count FROM topics', callback);
}

// Home page - list all topics with pagination
export const getHomePage = (captchaService, PAGE_SIZE, config) => async (req, res) => {
    try {
        const captcha = await captchaService.generate();
        captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, (err) => {
            if (err) {
                console.error('Error creating captcha:', err);
            }

            const currentPage = 1;
            const offset = (currentPage - 1) * PAGE_SIZE;

            getTotalTopicCount((err, row) => {
                if (err) {
                    return res.status(500).render('error', {
                        statusCode: 500,
                        message: 'Database error',
                        details: 'Unable to retrieve topic count. Please try again later.'
                    });
                }

                const totalTopics = row.count;
                const totalPages = Math.ceil(totalTopics / PAGE_SIZE);

                db.all(
                    'SELECT * FROM topics ORDER BY created_at DESC LIMIT ? OFFSET ?',
                    [PAGE_SIZE, offset],
                    (err, topics) => {
                        if (err) {
                            return res.status(500).render('error', {
                                statusCode: 500,
                                message: 'Database error',
                                details: 'Unable to retrieve topics. Please try again later.'
                            });
                        }
                        res.render('index', {
                            topics,
                            captchaKey: captcha.key,
                            captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                            currentPage,
                            totalPages,
                            registrationOpen: config.site.registrationOpen
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            statusCode: 500,
            message: 'Error loading page',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};

// Paginated home page
export const getHomePagePaginated = (captchaService, PAGE_SIZE, config) => async (req, res) => {
    try {
        const currentPage = parseInt(req.params.page) || 1;
        if (currentPage < 1) {
            return res.redirect('/');
        }

        const captcha = await captchaService.generate();
        captchaService.createCaptcha(captcha.key, captcha.text, captcha.createdAt, (err) => {
            if (err) {
                console.error('Error creating captcha:', err);
            }

            const offset = (currentPage - 1) * PAGE_SIZE;

            getTotalTopicCount((err, row) => {
                if (err) {
                    return res.status(500).render('error', {
                        statusCode: 500,
                        message: 'Database error',
                        details: 'Unable to retrieve topic count. Please try again later.'
                    });
                }

                const totalTopics = row.count;
                const totalPages = Math.ceil(totalTopics / PAGE_SIZE);

                if (currentPage > totalPages && totalPages > 0) {
                    return res.redirect(`/page/${totalPages}`);
                }

                db.all(
                    'SELECT * FROM topics ORDER BY created_at DESC LIMIT ? OFFSET ?',
                    [PAGE_SIZE, offset],
                    (err, topics) => {
                        if (err) {
                            return res.status(500).render('error', {
                                statusCode: 500,
                                message: 'Database error',
                                details: 'Unable to retrieve topics. Please try again later.'
                            });
                        }
                        res.render('index', {
                            topics,
                            captchaKey: captcha.key,
                            captchaExpiryMinutes: captchaService.getExpiryMinutes(),
                            currentPage,
                            totalPages,
                            registrationOpen: config.site.registrationOpen
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            statusCode: 500,
            message: 'Error loading page',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};
