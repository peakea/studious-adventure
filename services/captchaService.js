const { createCanvas } = require('canvas');
const crypto = require('crypto');

// Configuration variables
let captchaConfig = {
  colorMode: true,
  characters: 6,
  font: 'Comic Sans MS',
  size: 60,
  width: 400,
  height: 150,
  skew: true,
  rotate: 25,
  colors: [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#ffeaa7', '#a29bfe', '#fd79a8', '#fdcb6e'
  ],
  traceColor: '#2d3436',
  traceSize: 3
};

let captchaExpiryMs = 300000; // Default 5 minutes

// Helper function to generate random captcha text
const generateCaptchaText = (length) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes similar looking chars
  let text = '';
  for (let i = 0; i < length; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
};

// Helper function to get random color from config
const getRandomColor = () => {
  if (captchaConfig.colorMode && captchaConfig.colors.length > 0) {
    return captchaConfig.colors[Math.floor(Math.random() * captchaConfig.colors.length)];
  }
  return captchaConfig.colors[0];
};

// Setup function to initialize captcha service with config
const setupCaptchaService = (config = {}) => {
  captchaConfig = {
    colorMode: config.colorMode !== undefined ? config.colorMode : true,
    characters: config.characters || 6,
    font: config.font || 'Comic Sans MS',
    size: config.size || 60,
    width: config.width || 400,
    height: config.height || 150,
    skew: config.skew !== undefined ? config.skew : true,
    rotate: config.rotate || 25,
    colors: config.colors || [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
      '#ffeaa7', '#a29bfe', '#fd79a8', '#fdcb6e'
    ],
    traceColor: config.traceColor || '#2d3436',
    traceSize: config.traceSize || 3
  };

  captchaExpiryMs = config.expiryMs || 300000;

  console.log('Captcha service initialized');
};

// Generate a new captcha
const generate = async () => {
  const canvas = createCanvas(captchaConfig.width, captchaConfig.height);
  const ctx = canvas.getContext('2d');
  
  // Generate captcha text
  const text = generateCaptchaText(captchaConfig.characters);
  
  // Background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, captchaConfig.width, captchaConfig.height);
  
  // Add noise lines
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = captchaConfig.traceColor;
    ctx.lineWidth = captchaConfig.traceSize;
    ctx.beginPath();
    ctx.moveTo(Math.random() * captchaConfig.width, Math.random() * captchaConfig.height);
    ctx.lineTo(Math.random() * captchaConfig.width, Math.random() * captchaConfig.height);
    ctx.stroke();
  }
  
  // Draw text
  ctx.font = `${captchaConfig.size}px ${captchaConfig.font}`;
  ctx.textBaseline = 'middle';
  
  const charSpacing = captchaConfig.width / (captchaConfig.characters + 1);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = charSpacing * (i + 1);
    const y = captchaConfig.height / 2;
    
    ctx.save();
    
    // Apply transformations
    ctx.translate(x, y);
    
    if (captchaConfig.rotate) {
      const rotation = (Math.random() - 0.5) * (captchaConfig.rotate * Math.PI / 180);
      ctx.rotate(rotation);
    }
    
    if (captchaConfig.skew) {
      const skewX = (Math.random() - 0.5) * 0.3;
      const skewY = (Math.random() - 0.5) * 0.3;
      ctx.transform(1, skewY, skewX, 1, 0, 0);
    }
    
    // Set color
    ctx.fillStyle = getRandomColor();
    
    // Draw character centered
    ctx.fillText(char, -ctx.measureText(char).width / 2, 0);
    
    ctx.restore();
  }
  
  // Add noise dots
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = getRandomColor();
    ctx.fillRect(
      Math.random() * captchaConfig.width,
      Math.random() * captchaConfig.height,
      2,
      2
    );
  }
  
  const buffer = canvas.toBuffer('image/png');
  const key = crypto.randomBytes(16).toString('hex');
  
  return {
    key,
    text,
    buffer,
    createdAt: Date.now()
  };
};

// Verify a captcha answer
const verify = (userAnswer, storedAnswer) => {
  if (!userAnswer || !storedAnswer) return false;
  return userAnswer.toLowerCase().trim() === storedAnswer.toLowerCase().trim();
};

// Check if a captcha is expired based on creation time
const isExpired = (createdAt) => {
  return Date.now() > (createdAt + captchaExpiryMs);
};

// Get expiry time in minutes for display
const getExpiryMinutes = () => {
  return Math.floor(captchaExpiryMs / 60000);
};

module.exports = {
  setupCaptchaService,
  generate,
  verify,
  isExpired,
  getExpiryMinutes
};
