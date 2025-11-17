import { createCanvas } from 'canvas';
import crypto from 'crypto';
import createCaptchaModel from '../models/captchaModel.js';

/**
 * Captcha Service - handles captcha generation, verification, and cleanup
 * Follows the architecture from taegyo project
 */
export default function createCaptchaService(captchaConfig) {
    const config = {
        characters: captchaConfig.characters || 6,
        font: captchaConfig.font || 'Arial',
        size: captchaConfig.size || 60,
        width: captchaConfig.width || 350,
        height: captchaConfig.height || 150,
        expiryMs: captchaConfig.expiryMs || 300000,
        cleanupIntervalMs: captchaConfig.cleanupIntervalMs || 600000,
        colors: captchaConfig.colors || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a29bfe', '#fd79a8', '#fdcb6e'],
        traceColor: captchaConfig.traceColor || '#2d3436',
        traceSize: captchaConfig.traceSize || 3
    };

    // Create captcha model for database operations
    const captchaModel = createCaptchaModel();

    // Generate random captcha text
    function generateText(length) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Generate captcha image
    function generateImage(text) {
        const canvas = createCanvas(config.width, config.height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, config.width, config.height);

        // Add noise lines
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = config.traceColor;
            ctx.lineWidth = config.traceSize;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.random() * config.width, Math.random() * config.height);
            ctx.lineTo(Math.random() * config.width, Math.random() * config.height);
            ctx.stroke();
        }

        // Draw text with colors and transformations
        ctx.globalAlpha = 1.0;
        const chars = text.split('');
        const charWidth = config.width / (chars.length + 1);

        chars.forEach((char, i) => {
            const x = charWidth * (i + 1);
            const y = config.height / 2 + 20;
            const rotation = (Math.random() - 0.5) * 0.4;
            const fontSize = 50 + Math.random() * 20;
            const color = config.colors[Math.floor(Math.random() * config.colors.length)];

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.font = `bold ${fontSize}px ${config.font}`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(char, 0, 0);
            ctx.restore();
        });

        return canvas.toBuffer('image/png');
    }

    // Generate new captcha
    async function generate() {
        const text = generateText(config.characters);
        const key = crypto.randomBytes(16).toString('hex');
        const createdAt = Date.now();

        return {
            key,
            text,
            createdAt
        };
    }

    // Verify captcha
    function verify(userInput, storedText) {
        if (!userInput || !storedText) return false;
        return userInput.toLowerCase().trim() === storedText.toLowerCase().trim();
    }

    // Check if captcha is expired
    function isExpired(createdAt) {
        return Date.now() - createdAt > config.expiryMs;
    }

    // Get expiry time in minutes
    function getExpiryMinutes() {
        return Math.floor(config.expiryMs / 60000);
    }

    // Database operations using the model
    function createCaptcha(key, text, createdAt, callback) {
        captchaModel.create(key, text, createdAt, callback);
    }

    function findCaptchaByKey(key, callback) {
        captchaModel.findByKey(key, callback);
    }

    function deleteCaptcha(key, callback) {
        captchaModel.delete(key, callback);
    }

    // Cleanup function for expired captchas
    function cleanExpiredCaptchas() {
        captchaModel.cleanExpired(config.expiryMs, (err, removedCount) => {
            if (err) {
                console.error('Captcha cleanup error:', err);
            } else {
                if (removedCount > 0) {
                    console.log(`[Captcha Maintenance] Removed ${removedCount} expired captcha(s)`);
                }
            }
        });
    }

    // Get captcha statistics (for monitoring)
    function getStats(callback) {
        captchaModel.count((err, count) => {
            if (err) {
                callback(err, null);
            } else {
                callback(null, {
                    totalCaptchas: count,
                    expiryMinutes: getExpiryMinutes(),
                    cleanupIntervalMinutes: Math.floor(config.cleanupIntervalMs / 60000)
                });
            }
        });
    }

    // Start automatic cleanup interval
    console.log(`[Captcha Service] Starting cleanup service (interval: ${config.cleanupIntervalMs}ms, expiry: ${config.expiryMs}ms)`);
    const cleanupInterval = setInterval(cleanExpiredCaptchas, config.cleanupIntervalMs);

    // Run initial cleanup on startup
    setTimeout(cleanExpiredCaptchas, 5000); // Run after 5 seconds

    // Shutdown function to clean up interval
    function shutdown() {
        console.log('[Captcha Service] Shutting down cleanup service');
        clearInterval(cleanupInterval);
    }

    return {
        generate,
        generateImage,
        verify,
        isExpired,
        getExpiryMinutes,
        createCaptcha,
        findCaptchaByKey,
        deleteCaptcha,
        cleanExpiredCaptchas,
        getStats,
        shutdown,
        model: captchaModel // Expose model for advanced usage
    };
}
