// Serve captcha image
export const getCaptcha = (captchaService) => (req, res) => {
    const { key } = req.params;

    captchaService.findCaptchaByKey(key, (err, captcha) => {
        if (err || !captcha) {
            return res.status(404).render('error', {
                statusCode: 404,
                message: 'Captcha not found or expired',
                details: 'The captcha you requested is no longer available. Please go back and refresh the page.'
            });
        }

        if (captchaService.isExpired(captcha.created_at)) {
            captchaService.deleteCaptcha(key, () => {
                res.status(404).render('error', {
                    statusCode: 404,
                    message: 'Captcha expired',
                    details: 'The captcha has expired. Please go back and refresh the page to get a new one.'
                });
            });
            return;
        }

        try {
            const buffer = captchaService.generateImage(captcha.text);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(buffer);
        } catch (error) {
            console.error('Error generating captcha image:', error);
            res.status(500).render('error', {
                statusCode: 500,
                message: 'Error generating captcha image',
                details: 'Unable to generate captcha image. Please try again later.'
            });
        }
    });
};
