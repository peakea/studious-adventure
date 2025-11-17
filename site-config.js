#!/usr/bin/env node
/**
 * Site Configuration Utility
 * Manage registration and maintenance mode settings
 */

import fs from 'fs';
import path from 'path';

const CONFIG_FILE = './config.json';

// Load configuration
function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`Error: Configuration file ${CONFIG_FILE} not found`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

// Save configuration
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4), 'utf-8');
}

// Commands
const commands = {
    // Show current status
    status: () => {
        const config = loadConfig();
        
        console.log('\n🔧 Site Configuration Status');
        console.log('═'.repeat(60));
        console.log(`Site Title: ${config.site.title}`);
        console.log(`Registration: ${config.site.registrationOpen ? '✅ OPEN' : '❌ CLOSED'}`);
        console.log(`Maintenance Mode: ${config.site.maintenanceMode ? '🔧 ACTIVE' : '✅ INACTIVE'}`);
        if (config.site.maintenanceMode) {
            console.log(`Maintenance Message: "${config.site.maintenanceMessage}"`);
        }
        console.log('═'.repeat(60) + '\n');
        process.exit(0);
    },

    // Enable registration
    'registration:open': () => {
        const config = loadConfig();
        config.site.registrationOpen = true;
        saveConfig(config);
        console.log('\n✅ User registration is now OPEN\n');
        console.log('Note: Restart the server for changes to take effect.\n');
        process.exit(0);
    },

    // Disable registration
    'registration:close': () => {
        const config = loadConfig();
        config.site.registrationOpen = false;
        saveConfig(config);
        console.log('\n❌ User registration is now CLOSED\n');
        console.log('Note: Restart the server for changes to take effect.\n');
        process.exit(0);
    },

    // Enable maintenance mode
    'maintenance:on': () => {
        const config = loadConfig();
        const message = process.argv[3];
        
        config.site.maintenanceMode = true;
        if (message) {
            config.site.maintenanceMessage = message;
        }
        saveConfig(config);
        
        console.log('\n🔧 Maintenance mode is now ACTIVE\n');
        if (message) {
            console.log(`Message: "${message}"\n`);
        }
        console.log('Note: Restart the server for changes to take effect.');
        console.log('The site will display a maintenance page to all visitors.\n');
        process.exit(0);
    },

    // Disable maintenance mode
    'maintenance:off': () => {
        const config = loadConfig();
        config.site.maintenanceMode = false;
        saveConfig(config);
        console.log('\n✅ Maintenance mode is now INACTIVE\n');
        console.log('Note: Restart the server for changes to take effect.\n');
        process.exit(0);
    },

    // Set maintenance message
    'maintenance:message': () => {
        const config = loadConfig();
        const message = process.argv[3];
        
        if (!message) {
            console.error('\nError: Please provide a maintenance message\n');
            console.log('Usage: node site-config.js maintenance:message "Your message here"\n');
            process.exit(1);
        }
        
        config.site.maintenanceMessage = message;
        saveConfig(config);
        console.log('\n💬 Maintenance message updated:\n');
        console.log(`"${message}"\n`);
        console.log('Note: Restart the server for changes to take effect.\n');
        process.exit(0);
    },

    // Show help
    help: () => {
        console.log(`
🔧 Site Configuration Utility

Manage registration and maintenance mode settings for your forum.

Usage: node site-config.js <command> [options]

Commands:
  status                    Show current site configuration
  registration:open         Enable user registration
  registration:close        Disable user registration
  maintenance:on [message]  Enable maintenance mode with optional message
  maintenance:off           Disable maintenance mode
  maintenance:message "msg" Set maintenance mode message
  help                      Show this help message

Examples:
  # Check current status
  node site-config.js status

  # Open registration
  node site-config.js registration:open

  # Close registration
  node site-config.js registration:close

  # Enable maintenance mode
  node site-config.js maintenance:on

  # Enable maintenance mode with custom message
  node site-config.js maintenance:on "Upgrading database, back in 2 hours"

  # Disable maintenance mode
  node site-config.js maintenance:off

  # Update maintenance message
  node site-config.js maintenance:message "System upgrade in progress"

Configuration File:
  Settings are stored in ${CONFIG_FILE}

Notes:
  - Changes require a server restart to take effect
  - Maintenance mode blocks all site access (except static assets)
  - Registration status is shown on the homepage
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
