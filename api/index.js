const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:', 'https://via.placeholder.com'],
        },
    },
    xFrameOptions: { action: 'deny' },
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    entries: [{
        expenseItem: { type: String, default: null },
        expenseAmount: { type: Number, default: 0 },
        expenseDate: { type: Date, default: null },
        savingOption: { type: String, default: null },
        savingAmount: { type: Number, default: 0 },
        savingDate: { type: Date, default: null },
    }],
});

const User = mongoose.model('User', userSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Access denied: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        console.log(`Token verified for userId: ${req.userId}`);
        next();
    } catch (error) {
        console.log('Invalid token:', error.message);
        res.status(403).json({ message: 'Invalid token' });
    }
};

// Signup Route
app.post('/api/signup', [
    body('username').trim().notEmpty().withMessage('Username is required').escape(),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'Signup successful! Please log in.' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Input validation
        if (!identifier || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }],
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful!', userId: user._id, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Entry Route (Updated to Save Separately)
app.post('/api/entries', authenticateToken, async (req, res) => {
    try {
        const { expenseItem, expenseAmount, expenseDate, savingOption, savingAmount, savingDate } = req.body;
        console.log('Received entry data:', req.body);

        // Validate that at least one of expense or saving is provided
        if (!expenseItem && !savingOption) {
            return res.status(400).json({ message: 'At least one of expenseItem or savingOption is required' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create separate entries for expense and saving if both are provided
        const entriesToAdd = [];

        // Add expense entry if provided
        if (expenseItem) {
            const expenseEntry = {
                expenseItem,
                expenseAmount: parseFloat(expenseAmount) || 0,
                expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
                savingOption: null,
                savingAmount: 0,
                savingDate: null,
            };
            entriesToAdd.push(expenseEntry);
            console.log('Adding expense entry:', expenseEntry);
        }

        // Add saving entry if provided
        if (savingOption) {
            const savingEntry = {
                expenseItem: null,
                expenseAmount: 0,
                expenseDate: null,
                savingOption,
                savingAmount: parseFloat(savingAmount) || 0,
                savingDate: savingDate ? new Date(savingDate) : new Date(),
            };
            entriesToAdd.push(savingEntry);
            console.log('Adding saving entry:', savingEntry);
        }

        // Push all entries to the user's entries array
        user.entries.push(...entriesToAdd);
        await user.save();

        console.log('Entries saved successfully for user:', req.userId);
        res.status(201).json({ message: 'Data added successfully!' });
    } catch (error) {
        console.error('Add entry error:', error);
        res.status(500).json({ message: 'Server error: Failed to add entry' });
    }
});

// Get Entries Route
app.get('/api/entries/:userId', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.userId !== req.params.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        console.log(`Returning entries for user ${req.params.userId}:`, user.entries);
        res.status(200).json(user.entries);
    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Serve Frontend (Static Files)
app.use(express.static('public'));

// Export the app for Vercel
module.exports = app;

// Start the server only if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}