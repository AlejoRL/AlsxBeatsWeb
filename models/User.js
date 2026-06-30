const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    id:        { type: String, required: true },
    name:      { type: String, required: true },
    beats:     { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { _id: false });

const userSchema = new mongoose.Schema({
    id:               { type: String, required: true, unique: true },
    name:             { type: String, required: true, trim: true },
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:         { type: String, required: true },
    avatar:           { type: String, default: '' },
    createdAt:        { type: String, default: () => new Date().toISOString().split('T')[0] },
    plan:             { type: String, default: 'starter', enum: ['starter', 'pro', 'elite'] },
    verified:         { type: Boolean, default: false },
    otpCode:          { type: String, default: null },
    otpExpiry:        { type: Date,   default: null },
    resetToken:       { type: String, default: null },
    resetTokenExpiry: { type: Date,   default: null },
    likes:            { type: [String], default: [] },
    recentlyListened: { type: [String], default: [] },
    playlists:        { type: [playlistSchema], default: [] }
}, { versionKey: false });

module.exports = mongoose.model('User', userSchema);
