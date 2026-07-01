const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    price:   { type: Number, default: null },
    label:   String,
    formats: { type: [String], default: [] }
}, { _id: false });

const beatSchema = new mongoose.Schema({
    id:            { type: String, required: true, unique: true },
    title:         { type: String, required: true },
    producer:      { type: String, default: 'AlsxBeats' },
    bpm:           { type: Number, default: null },
    key:           { type: String, default: null },
    genre:         { type: String, default: null },
    tags:          { type: [String], default: [] },
    image:         { type: String, default: 'assets/images/alsxbeatsportada.png' },
    imageFileId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    preview:       { type: String, default: null },
    previewFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    publishedAt:   { type: String, default: () => new Date().toISOString().split('T')[0] },
    peaks:         { type: [Number], default: null },
    uploadedBy:    { type: String, default: null },
    licenses: {
        basic:     { type: licenseSchema, default: () => ({}) },
        basicWav:  { type: licenseSchema, default: () => ({}) },
        premium:   { type: licenseSchema, default: () => ({}) },
        unlimited: { type: licenseSchema, default: () => ({}) },
        exclusive: { type: licenseSchema, default: () => ({}) }
    }
}, { versionKey: false });

// Forma pública consistente con la que consumía el frontend cuando los beats
// vivían en data/beats.json.
beatSchema.methods.toPublic = function () {
    return {
        id:          this.id,
        title:       this.title,
        producer:    this.producer,
        bpm:         this.bpm,
        key:         this.key,
        genre:       this.genre,
        tags:        this.tags,
        image:       this.image,
        preview:     this.preview,
        publishedAt: this.publishedAt,
        peaks:       this.peaks,
        uploadedBy:  this.uploadedBy,
        licenses:    this.licenses
    };
};

module.exports = mongoose.model('Beat', beatSchema);
