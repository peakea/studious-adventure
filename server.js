import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import db from './db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import controllers
import * as homeController from './controllers/homeController.js';
import * as userController from './controllers/userController.js';
import * as topicController from './controllers/topicController.js';
import * as commentController from './controllers/commentController.js';
import * as captchaController from './controllers/captchaController.js';

// Load configuration
function loadConfig() {
    const CONFIG_FILE = './config.json';
    const DEFAULT_CONFIG_FILE = './default-config.json';

    if (!fs.existsSync(CONFIG_FILE)) {
        if (!fs.existsSync(DEFAULT_CONFIG_FILE)) {
            throw new Error(`Neither ${CONFIG_FILE} nor ${DEFAULT_CONFIG_FILE} found`);
        }
        fs.copyFileSync(DEFAULT_CONFIG_FILE, CONFIG_FILE);
        console.log(`Created ${CONFIG_FILE} from ${DEFAULT_CONFIG_FILE}`);
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

const config = loadConfig();
import createCaptchaService from './services/captchaService.js';
const captchaService = createCaptchaService(config.captcha);
import createMaintenanceMiddleware from './middleware/maintenanceMiddleware.js';

const app = express();
const PORT = process.env.PORT || config.server.port;
const PAGE_SIZE = config.pagination.pageSize;

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: config.rateLimit.general.windowMs,
    max: config.rateLimit.general.max,
    message: config.rateLimit.general.message
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(limiter); // Apply rate limiting to all routes
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Maintenance mode middleware - must be after view engine setup
app.use(createMaintenanceMiddleware(config));

// Routes
// Home page routes
app.get('/', homeController.getHomePage(captchaService, PAGE_SIZE, config));
app.get('/page/:page', homeController.getHomePagePaginated(captchaService, PAGE_SIZE, config));

// User routes
app.get('/user/:authorName', userController.getUserTopics(PAGE_SIZE));
app.get('/user/:authorName/page/:page', userController.getUserTopicsPaginated(PAGE_SIZE));
app.get('/signup', userController.getSignupPage(captchaService, config));
app.post('/signup', userController.postSignup(captchaService, config));

// Captcha routes
app.get('/captcha/:key', captchaController.getCaptcha(captchaService));

// Topic routes
app.get('/topic/:id', topicController.getTopic);
app.get('/topic/:id/delete', topicController.getDeleteTopic);
app.post('/topic/:id/delete', topicController.postDeleteTopic);
app.post('/topic', topicController.postCreateTopic(captchaService));

// Comment routes
app.post('/topic/:id/comment', commentController.postComment);

app.listen(PORT, config.server.host, () => {
    console.log(`${config.site.title} running on http://${config.server.host}:${PORT}`);
});
