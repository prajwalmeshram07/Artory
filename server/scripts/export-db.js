const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Default database URI from project config
const MONGO_URI = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/artory';

// Output target locations
const SERVER_OUTPUT_PATH = path.join(__dirname, '../seed_data.json');
const ROOT_OUTPUT_PATH = path.join(__dirname, '../../seed_data.json');

// Safe dummy bcrypt hash for development accounts (Password: Password@123)
const SAFE_DEVELOPMENT_PASSWORD = 'Password@123';
const SAFE_DUMMY_PASSWORD_HASH = bcrypt.hashSync(SAFE_DEVELOPMENT_PASSWORD, 10);

// Safe mock placeholder URLs for sensitive verification attachments
const MOCK_AADHAAR_PLACEHOLDER = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80';
const MOCK_PASSPORT_PLACEHOLDER = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

/**
 * Recursively sanitize sensitive fields within documents
 */
function sanitizeDocument(collectionName, doc) {
  if (!doc || typeof doc !== 'object') return doc;

  const sanitized = Array.isArray(doc) ? [...doc] : { ...doc };

  if (collectionName === 'users') {
    if (sanitized.password) {
      sanitized.password = SAFE_DUMMY_PASSWORD_HASH;
    }
    // Remove any legacy reset tokens or secret fields
    delete sanitized.resetPasswordToken;
    delete sanitized.resetPasswordExpires;
    delete sanitized.verificationToken;
  }

  if (collectionName === 'verificationrequests') {
    if (sanitized.aadhaarImage) sanitized.aadhaarImage = MOCK_AADHAAR_PLACEHOLDER;
    if (sanitized.passportPhoto) sanitized.passportPhoto = MOCK_PASSPORT_PLACEHOLDER;
  }

  return sanitized;
}

async function exportDatabase() {
  console.log('====================================================');
  console.log('🚀 Artory Local Database JSON Exporter');
  console.log('====================================================');
  console.log(`Connecting to MongoDB: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  let client;
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB successfully.\n');

    const db = mongoose.connection.db;
    const collectionsList = await db.listCollections().toArray();

    // Filter out internal system collections
    const collections = collectionsList
      .map(c => c.name)
      .filter(name => !name.startsWith('system.'));

    console.log(`Discovered ${collections.length} collections: [${collections.join(', ')}]\n`);

    const exportData = {
      _meta: {
        exportedAt: new Date().toISOString(),
        database: db.databaseName,
        totalCollections: collections.length,
        sanitizationNote: 'All user passwords sanitized to bcrypt hash for "Password@123". Identity documents sanitized.',
      },
      collections: {}
    };

    let totalDocuments = 0;

    for (const collName of collections) {
      const coll = db.collection(collName);
      const docs = await coll.find({}).toArray();

      const sanitizedDocs = docs.map(doc => sanitizeDocument(collName, doc));
      exportData.collections[collName] = sanitizedDocs;
      totalDocuments += sanitizedDocs.length;

      console.log(`  📦 Collection '${collName}': exported ${sanitizedDocs.length} documents`);
    }

    const jsonString = JSON.stringify(exportData, null, 2);

    // Save to server directory
    fs.writeFileSync(SERVER_OUTPUT_PATH, jsonString, 'utf-8');
    console.log(`\n💾 Saved: ${SERVER_OUTPUT_PATH} (${(Buffer.byteLength(jsonString) / 1024).toFixed(2)} KB)`);

    // Also mirror to root directory for convenient repository-level access
    try {
      fs.writeFileSync(ROOT_OUTPUT_PATH, jsonString, 'utf-8');
      console.log(`💾 Mirrored to root: ${ROOT_OUTPUT_PATH}`);
    } catch (rootErr) {
      // Non-critical if root is inaccessible
    }

    console.log('\n====================================================');
    console.log(`🎉 Export Completed Successfully! Total Documents: ${totalDocuments}`);
    console.log(`🔑 All exported user passwords are now: "${SAFE_DEVELOPMENT_PASSWORD}"`);
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database export failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

exportDatabase();
