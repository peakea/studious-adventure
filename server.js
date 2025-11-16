const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const captchaService = require('./services/captchaService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize captcha service
captchaService.setupCaptchaService({
  colorMode: true,
  characters: 6,
  font: 'Comic Sans MS',
  size: 60,
  width: 400,
  height: 150,
  expiryMs: 300000 // 5 minutes
});

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 posts per windowMs
  message: 'Too many posts from this IP, please try again later.'
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(limiter); // Apply rate limiting to all routes
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper function to hash keys
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Routes

// Signup page - GET
app.get('/signup', async (req, res) => {
  try {
    // Generate captcha
    const captcha = await captchaService.generate();
    
    // Store captcha in database
    db.run(
      'INSERT INTO captchas (key, text, created_at) VALUES (?, ?, ?)',
      [captcha.key, captcha.text, captcha.createdAt],
      (err) => {
        if (err) {
          console.error('Error storing captcha:', err);
          return res.status(500).send('Error generating captcha');
        }
        
        res.render('signup', {
          captchaKey: captcha.key,
          captchaExpiryMinutes: captchaService.getExpiryMinutes(),
          error: null
        });
      }
    );
  } catch (error) {
    console.error('Error generating captcha:', error);
    res.status(500).send('Error loading signup page');
  }
});

// Signup page - POST
app.post('/signup', postLimiter, async (req, res) => {
  const { captchaKey, captchaAnswer } = req.body;
  
  try {
    // Verify captcha fields exist
    if (!captchaKey || !captchaAnswer) {
      const captcha = await captchaService.generate();
      db.run(
        'INSERT INTO captchas (key, text, created_at) VALUES (?, ?, ?)',
        [captcha.key, captcha.text, captcha.createdAt]
      );
      return res.render('signup', {
        captchaKey: captcha.key,
        captchaExpiryMinutes: captchaService.getExpiryMinutes(),
        error: 'Please complete the captcha verification'
      });
    }
    
    // Find captcha in database
    db.get('SELECT * FROM captchas WHERE key = ?', [captchaKey], async (err, storedCaptcha) => {
      if (err || !storedCaptcha) {
        const captcha = await captchaService.generate();
        db.run(
          'INSERT INTO captchas (key, text, created_at) VALUES (?, ?, ?)',
          [captcha.key, captcha.text, captcha.createdAt]
        );
        return res.render('signup', {
          captchaKey: captcha.key,
          captchaExpiryMinutes: captchaService.getExpiryMinutes(),
          error: 'Captcha not found or already used. Please try again.'
        });
      }
      
      // Check if captcha is expired
      if (captchaService.isExpired(storedCaptcha.created_at)) {
        db.run('DELETE FROM captchas WHERE key = ?', [captchaKey]);
        const captcha = await captchaService.generate();
        db.run(
          'INSERT INTO captchas (key, text, created_at) VALUES (?, ?, ?)',
          [captcha.key, captcha.text, captcha.createdAt]
        );
        return res.render('signup', {
          captchaKey: captcha.key,
          captchaExpiryMinutes: captchaService.getExpiryMinutes(),
          error: 'Captcha expired. Please try again.'
        });
      }
      
      // Verify captcha answer
      if (!captchaService.verify(captchaAnswer, storedCaptcha.text)) {
        db.run('DELETE FROM captchas WHERE key = ?', [captchaKey]);
        const captcha = await captchaService.generate();
        db.run(
          'INSERT INTO captchas (key, text, created_at) VALUES (?, ?, ?)',
          [captcha.key, captcha.text, captcha.createdAt]
        );
        return res.render('signup', {
          captchaKey: captcha.key,
          captchaExpiryMinutes: captchaService.getExpiryMinutes(),
          error: 'Incorrect captcha. Please try again.'
        });
      }
      
      // Delete used captcha
      db.run('DELETE FROM captchas WHERE key = ?', [captchaKey]);
      
      // Generate user key
      const userId = crypto.randomBytes(16).toString('hex');
      const userKey = crypto.randomBytes(16).toString('hex');
      const keyHash = hashKey(userKey);
      
      // Create user
      db.run(
        'INSERT INTO users (id, key_hash) VALUES (?, ?)',
        [userId, keyHash],
        (err) => {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).send('Error creating account');
          }
          
          res.render('signup-success', { userKey });
        }
      );
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send('Error processing signup');
  }
});

// Captcha image route
app.get('/captcha/:key', (req, res) => {
  const captchaKey = req.params.key;
  
  db.get('SELECT * FROM captchas WHERE key = ?', [captchaKey], async (err, captcha) => {
    if (err || !captcha) {
      return res.status(404).send('Captcha not found');
    }
    
    // Check if expired
    if (captchaService.isExpired(captcha.created_at)) {
      db.run('DELETE FROM captchas WHERE key = ?', [captchaKey]);
      return res.status(410).send('Captcha expired');
    }
    
    try {
      // Regenerate the captcha image with the stored text
      const canvas = require('canvas').createCanvas(400, 150);
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 400, 150);
      
      // Add noise lines
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a29bfe', '#fd79a8', '#fdcb6e'];
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.random() * 400, Math.random() * 150);
        ctx.lineTo(Math.random() * 400, Math.random() * 150);
        ctx.stroke();
      }
      
      // Draw text
      ctx.font = '60px Comic Sans MS';
      ctx.textBaseline = 'middle';
      
      const text = captcha.text;
      const charSpacing = 400 / (text.length + 1);
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const x = charSpacing * (i + 1);
        const y = 150 / 2;
        
        ctx.save();
        ctx.translate(x, y);
        
        const rotation = (Math.random() - 0.5) * (25 * Math.PI / 180);
        ctx.rotate(rotation);
        
        const skewX = (Math.random() - 0.5) * 0.3;
        const skewY = (Math.random() - 0.5) * 0.3;
        ctx.transform(1, skewY, skewX, 1, 0, 0);
        
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillText(char, -ctx.measureText(char).width / 2, 0);
        
        ctx.restore();
      }
      
      // Add noise dots
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(Math.random() * 400, Math.random() * 150, 2, 2);
      }
      
      const buffer = canvas.toBuffer('image/png');
      
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'no-cache');
      res.send(buffer);
    } catch (error) {
      console.error('Error generating captcha image:', error);
      res.status(500).send('Error generating captcha image');
    }
  });
});

// Home page - list all topics
app.get('/', (req, res) => {
  db.all('SELECT * FROM topics ORDER BY created_at DESC', (err, topics) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('index', { topics });
  });
});

// View a specific topic with its comments
app.get('/topic/:id', (req, res) => {
  const topicId = req.params.id;
  
  db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
    if (err || !topic) {
      return res.status(404).send('Topic not found');
    }
    
    db.all(
      'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
      [topicId],
      (err, comments) => {
        if (err) {
          return res.status(500).send('Database error');
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
});

// Post a new comment
app.post('/topic/:id/comment', postLimiter, (req, res) => {
  const topicId = req.params.id;
  const { author, content, key, file_link, totp_secret } = req.body;
  
  // Validate required fields
  if (!author || !content || !key) {
    return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
      if (err || !topic) {
        return res.status(404).send('Topic not found');
      }
      db.all(
        'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
        [topicId],
        (err, comments) => {
          res.render('topic', {
            topic,
            comments: comments || [],
            error: 'Author, content, and key are required',
            success: null
          });
        }
      );
    });
  }
  
  // Hash the key
  const keyHash = hashKey(key);
  
  // Validate the key against registered users
  db.get('SELECT * FROM users WHERE key_hash = ?', [keyHash], (err, user) => {
    if (err || !user) {
      return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
        if (err || !topic) {
          return res.status(404).send('Topic not found');
        }
        db.all(
          'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
          [topicId],
          (err, comments) => {
            res.render('topic', {
              topic,
              comments: comments || [],
              error: 'Invalid key. Please sign up first to get a valid key.',
              success: null
            });
          }
        );
      });
    }
    
    // Validate TOTP secret if provided
    let validatedSecret = null;
    if (totp_secret) {
      try {
        // Test if the secret is valid by trying to generate a token
        authenticator.generate(totp_secret);
        validatedSecret = totp_secret;
      } catch (e) {
        return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
          if (err || !topic) {
            return res.status(404).send('Topic not found');
          }
          db.all(
            'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
            [topicId],
            (err, comments) => {
              res.render('topic', {
                topic,
                comments: comments || [],
                error: 'Invalid TOTP secret format',
                success: null
              });
            }
          );
        });
      }
    }
    
    // Insert comment
    db.run(
      'INSERT INTO comments (topic_id, author, content, key_hash, file_link, totp_secret) VALUES (?, ?, ?, ?, ?, ?)',
      [topicId, author, content, keyHash, file_link || null, validatedSecret],
      function(err) {
        if (err) {
          return res.status(500).send('Error posting comment');
        }
        
        // Redirect back to topic page
        res.redirect(`/topic/${topicId}`);
      }
    );
  });
});

// Create a new topic
app.post('/topic', postLimiter, (req, res) => {
  const { title } = req.body;
  
  if (!title) {
    return res.redirect('/?error=title_required');
  }
  
  db.run('INSERT INTO topics (title) VALUES (?)', [title], function(err) {
    if (err) {
      return res.status(500).send('Error creating topic');
    }
    res.redirect(`/topic/${this.lastID}`);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
