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
    plan:               { type: String, default: 'starter', enum: ['starter', 'pro', 'elite'] },
    verified:           { type: Boolean, default: false },
    verificationToken:  { type: String, default: null },
    verificationStatus: { type: String, default: 'none', enum: ['none', 'pending', 'approved', 'rejected'] },
    verificationData: {
        fullName:        { type: String, default: '' },
        documentType:    { type: String, default: '' },
        documentNumber:  { type: String, default: '' },
        country:         { type: String, default: '' },
        birthDate:       { type: String, default: '' },
        documentUrl:     { type: String, default: '' },
        selfieUrl:       { type: String, default: '' },
        submittedAt:     { type: Date,   default: null },
        reviewedAt:      { type: Date,   default: null },
        rejectionReason: { type: String, default: '' }
    },
    likes:            { type: [String], default: [] },
    recentlyListened: { type: [String], default: [] },
    playlists:        { type: [playlistSchema], default: [] }
}, { versionKey: false });

module.exports = mongoose.model('User', userSchema);
