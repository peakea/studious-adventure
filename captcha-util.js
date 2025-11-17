#!/usr/bin/env node
/**
 * Captcha Maintenance Utility
 * Provides commands for managing and monitoring captcha keys
 */

import db from './db.js';
import createCaptchaModel from './models/captchaModel.js';
import fs from 'fs';

// Load configuration
function loadConfig() {
    const CONFIG_FILE = './config.json';
    const DEFAULT_CONFIG_FILE = './default-config.json';

    if (!fs.existsSync(CONFIG_FILE)) {
        if (!fs.existsSync(DEFAULT_CONFIG_FILE)) {
            console.error('Error: Configuration file not found');
            process.exit(1);
        }
        fs.copyFileSync(DEFAULT_CONFIG_FILE, CONFIG_FILE);
        console.log(`Created ${CONFIG_FILE} from ${DEFAULT_CONFIG_FILE}`);
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

const config = loadConfig();
const captchaModel = createCaptchaModel();

// Commands
const commands = {
    // Show captcha statistics
    stats: () => {
        captchaModel.count((err, count) => {
            if (err) {
                console.error('Error getting captcha count:', err);
                process.exit(1);
            }

            const expiryMinutes = Math.floor(config.captcha.expiryMs / 60000);
            const cleanupMinutes = Math.floor(config.captcha.cleanupIntervalMs / 60000);

            console.log('\n📊 Captcha Statistics');
            console.log('═'.repeat(50));
            console.log(`Total captchas in database: ${count}`);
            console.log(`Expiry time: ${expiryMinutes} minutes`);
            console.log(`Cleanup interval: ${cleanupMinutes} minutes`);
            console.log('═'.repeat(50) + '\n');

            process.exit(0);
        });
    },

    // Clean expired captchas
    clean: () => {
        const expiryMs = config.captcha.expiryMs;
        captchaModel.cleanExpired(expiryMs, (err, removedCount) => {
            if (err) {
                console.error('Error cleaning expired captchas:', err);
                process.exit(1);
            }

            console.log(`\n🧹 Cleanup Complete`);
            console.log(`Removed ${removedCount} expired captcha(s)\n`);
            process.exit(0);
        });
    },

    // List all captchas (for debugging)
    list: () => {
        db.all('SELECT * FROM captchas ORDER BY created_at DESC', [], (err, captchas) => {
            if (err) {
                console.error('Error listing captchas:', err);
                process.exit(1);
            }

            console.log('\n📋 All Captchas');
            console.log('═'.repeat(70));

            if (captchas.length === 0) {
                console.log('No captchas found in database');
            } else {
                const now = Date.now();
                captchas.forEach(captcha => {
                    const age = Math.floor((now - captcha.created_at) / 1000);
                    const ageMinutes = Math.floor(age / 60);
                    const ageSeconds = age % 60;
                    const expired = (now - captcha.created_at) > config.captcha.expiryMs;
                    const status = expired ? '❌ EXPIRED' : '✅ VALID';

                    console.log(`${status} | Key: ${captcha.key.substring(0, 16)}... | Age: ${ageMinutes}m ${ageSeconds}s`);
                });
            }

            console.log('═'.repeat(70) + '\n');
            process.exit(0);
        });
    },

    // Clear all captchas (use with caution)
    clear: () => {
        db.run('DELETE FROM captchas', [], function(err) {
            if (err) {
                console.error('Error clearing captchas:', err);
                process.exit(1);
            }

            console.log(`\n🗑️  Cleared all captchas (${this.changes} removed)\n`);
            process.exit(0);
        });
    },

    // Show help
    help: () => {
        console.log(`
🔧 Captcha Maintenance Utility

Usage: node captcha-util.js <command>

Commands:
  stats     Show captcha statistics and configuration
  clean     Remove expired captchas from database
  list      List all captchas with their status
  clear     Remove ALL captchas (use with caution)
  help      Show this help message

Examples:
  node captcha-util.js stats
  node captcha-util.js clean
  node captcha-util.js list

Configuration:
  Captcha settings are managed in config.json
  - expiryMs: How long captchas remain valid
  - cleanupIntervalMs: How often automatic cleanup runs
        `);
        process.exit(0);
    }
};

// Parse command line arguments
const command = process.argv[2];

if (!command || !commands[command]) {
    console.error(`\nError: Unknown command "${command || ''}"\n`);
    commands.help();
} else {
    commands[command]();
}
