/**
 * Maintenance Mode Middleware
 * Blocks all requests when maintenance mode is enabled
 */

export default function createMaintenanceMiddleware(config) {
    return (req, res, next) => {
        // Check if maintenance mode is enabled
        if (config.site.maintenanceMode) {
            // Allow access to static assets
            if (req.path.startsWith('/images/') || req.path.startsWith('/styles/')) {
                return next();
            }

            // Render maintenance page for all other routes
            return res.status(503).render('maintenance', {
                title: 'Maintenance Mode',
                message: config.site.maintenanceMessage || 'The forum is currently undergoing maintenance. Please check back later.',
                siteTitle: config.site.title
            });
        }

        next();
    };
}
