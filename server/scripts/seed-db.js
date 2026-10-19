const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/artory';

// Potential locations for seed_data.json
const SEED_FILE_PATHS = [
  path.join(__dirname, '../seed_data.json'),
  path.join(__dirname, '../../seed_data.json'),
  path.join(process.cwd(), 'seed_data.json')
];

// 24-character hexadecimal regex for ObjectId
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
// ISO-8601 date regex
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

// Fields that are known to be ObjectIds across models
const OBJECT_ID_FIELD_NAMES = new Set([
  '_id',
  'user',
  'userId',
  'artist',
  'creator',
  'author',
  'buyer',
  'recipient',
  'sender',
  'receiver',
  'reviewer',
  'applicant',
  'reviewedBy',
  'organizer',
  'reporter',
  'request',
  'application',
  'acceptedArtist',
  'acceptedApplication',
  'requester',
  'community',
  'group',
  'artwork',
  'product',
  'parentComment',
  'messageId',
  'targetId'
]);

/**
 * Recursively convert plain JSON strings to BSON Types (ObjectId, Date)
 */
function reviveBsonTypes(value, key = null) {
  if (value === null || value === undefined) return value;

  // Extended JSON: { $oid: "..." }
  if (typeof value === 'object' && value.$oid && typeof value.$oid === 'string') {
    return new mongoose.Types.ObjectId(value.$oid);
  }

  // Extended JSON: { $date: "..." }
  if (typeof value === 'object' && value.$date) {
    return new Date(value.$date);
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(item => reviveBsonTypes(item, key));
  }

  // Objects
  if (typeof value === 'object') {
    const revivedObj = {};
    for (const [k, v] of Object.entries(value)) {
      revivedObj[k] = reviveBsonTypes(v, k);
    }
    return revivedObj;
  }

  // String conversions
  if (typeof value === 'string') {
    // If key indicates an ObjectId or value is in an ObjectId array
    if ((key && OBJECT_ID_FIELD_NAMES.has(key)) && OBJECT_ID_REGEX.test(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    // General 24-hex string in _id or ref array
    if (key === '_id' && OBJECT_ID_REGEX.test(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    // Date fields
    if (ISO_DATE_REGEX.test(value)) {
      return new Date(value);
    }
  }

  return value;
}

/**
 * Mode 1: Import database from seed_data.json
 */
async function seedFromJson(filePath, db) {
  console.log(`📖 Loading seed data from: ${filePath}`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(rawData);

  const collectionsData = parsed.collections || parsed;
  const collectionNames = Object.keys(collectionsData);

  console.log(`Found ${collectionNames.length} collections to restore.\n`);

  let totalRestored = 0;

  for (const collName of collectionNames) {
    const rawDocs = collectionsData[collName];
    if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
      console.log(`  ⏩ Collection '${collName}': 0 documents (skipped)`);
      continue;
    }

    const coll = db.collection(collName);

    // Clean existing collection data to ensure fresh idempotent seed
    await coll.deleteMany({});

    // Revive ObjectIds and Dates
    const docsToInsert = rawDocs.map(doc => reviveBsonTypes(doc));

    try {
      const result = await coll.insertMany(docsToInsert, { ordered: false });
      totalRestored += result.insertedCount;
      console.log(`  ✅ Collection '${collName}': inserted ${result.insertedCount} documents`);
    } catch (insertErr) {
      if (insertErr.insertedCount > 0) {
        totalRestored += insertErr.insertedCount;
        console.warn(`  ⚠️ Collection '${collName}': inserted ${insertErr.insertedCount} documents with some duplicates skipped`);
      } else {
        console.error(`  ❌ Collection '${collName}' insert error: ${insertErr.message}`);
      }
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 Database Restored from JSON! Total documents: ${totalRestored}`);
  console.log('🔑 Login using any exported user with password: "Password@123"');
  console.log('====================================================\n');
}

/**
 * Mode 2: Generate realistic dummy seed records across core models
 */
async function seedRealisticDefaults(db) {
  console.log('🌱 No seed_data.json found. Generating realistic dummy records based on schema models...\n');

  // Load Mongoose models
  const User = require('../models/User');
  const Admin = require('../models/Admin');
  const Product = require('../models/Product');
  const Order = require('../models/Order');
  const Artwork = require('../models/Artwork');
  const Comic = require('../models/Comic');
  const Comment = require('../models/Comment');
  const Mentor = require('../models/Mentor');
  const ArtRequest = require('../models/ArtRequest');
  const Application = require('../models/Application');
  const Chat = require('../models/Chat');
  const Community = require('../models/Community');
  const CommunityMessage = require('../models/CommunityMessage');
  const Competition = require('../models/Competition');
  const Notification = require('../models/Notification');
  const UserInterest = require('../models/UserInterest');
  const ArtHistory = require('../models/ArtHistory');

  // Purge existing records for clean state
  console.log('🧹 Purging existing test records...');
  await Promise.all([
    User.deleteMany({ email: { $in: ['admin@artory.com', 'vincent@artory.com', 'collector@artory.com'] } }),
    Admin.deleteMany({}),
    Product.deleteMany({ title: { $in: ['Starry Night Canvas', 'Sunflowers Study', 'Digital Aurora NFT'] } }),
    Order.deleteMany({}),
    Artwork.deleteMany({ title: { $in: ['Starry Night Over The Rhone', 'Terrace at Night'] } }),
    Comic.deleteMany({ title: 'Adventures in Brushland' }),
    Community.deleteMany({ name: 'Traditional Painters Guild' }),
    Competition.deleteMany({ title: 'Spring Palette 2026' }),
    Mentor.deleteMany({ name: 'Vincent van Gogh' }),
    ArtHistory.deleteMany({ title: 'Impressionism & Post-Impressionism' })
  ]);

  console.log('🔑 Generating password hashes...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const artistPassword = await bcrypt.hash('Artist@123', salt);
  const buyerPassword = await bcrypt.hash('Buyer@123', salt);

  console.log('👥 Seeding core users...');

  // 1. Admin User
  const adminUser = await User.create({
    username: 'admin',
    email: 'admin@artory.com',
    password: adminPassword,
    role: 'admin',
    age: 32,
    isVerified: true,
    bio: 'Platform administrator and content curator at Artory.',
    profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  });

  await Admin.create({
    user: adminUser._id,
    securityLevel: 'super',
    departments: ['users', 'marketplace', 'content', 'billing'],
    permissions: ['manage_users', 'manage_content', 'manage_orders', 'review_verifications'],
    isActive: true
  });
  console.log(`  🛡️ Admin: admin@artory.com (Password: Admin@123)`);

  // 2. Artist User (Mentor)
  const artistUser = await User.create({
    username: 'vincent_art',
    email: 'vincent@artory.com',
    password: artistPassword,
    role: 'mentor',
    age: 37,
    isVerified: true,
    bio: 'Post-Impressionist painter passionate about rich vibrant textures, oil paints, and color harmony.',
    skills: ['Oil Painting', 'Sketching', 'Color Theory', 'Impressionism'],
    artInterests: ['Landscape', 'Still Life', 'Portrait'],
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    socialLinks: { instagram: 'vincent_art', twitter: 'vincent_canvas', website: 'https://vincentart.example.com' }
  });

  await Mentor.create({
    userId: artistUser._id,
    name: 'Vincent van Gogh',
    bio: 'Master of expressive color and emotional brushwork. Offering critique and mentorship on traditional oil painting.',
    skills: ['Oil Painting', 'Impressionism', 'Composition', 'Color Harmony'],
    teachingCategories: ['Traditional Art', 'Oil Canvas', 'Sketching'],
    experience: 15,
    rating: 4.9,
    reviewCount: 42,
    price: 35,
    isAvailable: true,
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80'
  });
  console.log(`  🎨 Artist / Mentor: vincent@artory.com (Password: Artist@123)`);

  // 3. Buyer User
  const buyerUser = await User.create({
    username: 'art_collector',
    email: 'collector@artory.com',
    password: buyerPassword,
    role: 'user',
    age: 29,
    isVerified: false,
    bio: 'Passionate collector of traditional oil canvas reproductions and contemporary digital concept art.',
    artInterests: ['Modern Art', 'Oil Painting', 'Digital Art'],
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'
  });
  console.log(`  🛒 Buyer: collector@artory.com (Password: Buyer@123)`);

  // Connect follower relationships
  artistUser.followers.push(buyerUser._id);
  await artistUser.save();
  buyerUser.following.push(artistUser._id);
  await buyerUser.save();

  // 4. User Interests & Recommendations
  await UserInterest.create({
    userId: buyerUser._id,
    interests: ['Oil Painting', 'Impressionism', 'Digital Art'],
    favoriteTags: ['canvas', 'oil', 'colorful', 'landscape'],
    learningGoals: ['Understand color theory and brushwork'],
    searchHistory: [{ query: 'oil painting landscape techniques', timestamp: new Date() }]
  });

  // 5. Artworks & Comments
  console.log('🖼️ Seeding artworks & comments...');
  const artwork1 = await Artwork.create({
    title: 'Starry Night Over The Rhone',
    description: 'A study of reflection of artificial gas lighting in the dark waters of the Rhone.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
    category: 'painting',
    tags: ['oil', 'classic', 'impressionism', 'rhone'],
    artist: artistUser._id,
    views: 1420,
    isFeatured: true,
    likes: [buyerUser._id]
  });

  const comment1 = await Comment.create({
    author: buyerUser._id,
    artwork: artwork1._id,
    content: 'The interplay of light on the water surface is truly magnificent!',
    likes: [artistUser._id]
  });
  artwork1.comments.push(comment1._id);
  await artwork1.save();

  // 6. Comics & Episodes
  console.log('📚 Seeding comics...');
  await Comic.create({
    title: 'Adventures in Brushland',
    description: 'An episodic graphic journey through classic art movements and fantasy kingdoms.',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
    creator: artistUser._id,
    genre: 'Fantasy / Educational',
    episodes: [
      {
        episodeNumber: 1,
        title: 'The Awakening Palette',
        pages: ['https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800'],
        publishedAt: new Date()
      }
    ],
    likes: [buyerUser._id],
    followers: [buyerUser._id]
  });

  // 7. Marketplace Products & Orders
  console.log('🛍️ Seeding products & demo order...');
  const product1 = await Product.create({
    title: 'Starry Night Canvas',
    description: 'Museum-quality archival canvas print reproduction on 400gsm cotton.',
    price: 120.00,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
    category: 'painting',
    stock: 8,
    tags: ['classic', 'canvas', 'oil', 'masterpiece'],
    artist: artistUser._id
  });

  const product2 = await Product.create({
    title: 'Sunflowers Study',
    description: 'Hand-drawn charcoal and pastel study on textured paper.',
    price: 45.00,
    imageUrl: 'https://images.unsplash.com/photo-1579783928621-7a13d66a6211',
    category: 'sketch',
    stock: 15,
    tags: ['sketch', 'sunflower', 'study'],
    artist: artistUser._id
  });

  await Order.create({
    buyer: buyerUser._id,
    products: [
      { product: product1._id, quantity: 1, priceAtPurchase: 120.00 },
      { product: product2._id, quantity: 1, priceAtPurchase: 45.00 }
    ],
    totalAmount: 165.00,
    shippingAddress: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      zipCode: '97477',
      country: 'USA'
    },
    paymentStatus: 'paid',
    status: 'processing'
  });

  // 8. Custom Commission Request, Application & Chat
  console.log('🎨 Seeding custom art commission...');
  const artRequest = await ArtRequest.create({
    creator: buyerUser._id,
    acceptedArtist: artistUser._id,
    title: 'Impressionist Portrait of Sunflower Field',
    description: 'Looking for a custom oil-style painting of a sunset sunflower meadow with warm golden hour tones.',
    category: 'Painting',
    budget: { min: 100, max: 200, currency: 'USD' },
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'Pending'
  });

  const application = await Application.create({
    request: artRequest._id,
    artist: artistUser._id,
    message: 'I would love to paint this! I have extensive experience in golden-hour oil landscapes.',
    portfolioLinks: ['https://vincentart.example.com'],
    status: 'Accepted'
  });

  artRequest.acceptedApplication = application._id;
  await artRequest.save();

  await Chat.create({
    request: artRequest._id,
    application: application._id,
    requester: buyerUser._id,
    artist: artistUser._id,
    messages: [
      { sender: buyerUser._id, message: 'Hi Vincent, excited to collaborate!' },
      { sender: artistUser._id, message: 'Thank you! I will share initial thumbnail sketches tomorrow.' }
    ]
  });

  // 9. Community & Community Messages
  console.log('🌐 Seeding community...');
  const community = await Community.create({
    name: 'Traditional Painters Guild',
    description: 'A welcoming space for classical, oil, acrylic, and watercolor painters.',
    category: 'Traditional Art',
    coverImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b',
    avatar: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
    creator: artistUser._id,
    members: [artistUser._id, buyerUser._id],
    moderators: [artistUser._id],
    posts: [artwork1._id],
    isPrivate: false
  });

  await CommunityMessage.create({
    community: community._id,
    sender: artistUser._id,
    message: 'Welcome everyone to the Guild! Feel free to share your current works in progress.'
  });

  // 10. Art Competition
  console.log('🏆 Seeding competition...');
  await Competition.create({
    title: 'Spring Palette 2026',
    description: 'Showcase original art inspired by the rejuvenation of spring and fresh beginnings.',
    category: 'Painting',
    organizer: adminUser._id,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    prize: '$500 Art Supplies Voucher + Featured Placement',
    participants: [artistUser._id],
    submissions: [{
      artist: artistUser._id,
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
      submittedAt: new Date()
    }],
    isActive: true,
    status: 'approved'
  });

  // 11. Art History Article
  await ArtHistory.create({
    title: 'Impressionism & Post-Impressionism',
    description: 'A study of the revolutionary 19th-century movements rejecting rigid academic painting in favor of light, color, and emotional perception.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
    historyDate: new Date('1886-05-01'),
    author: adminUser._id
  });

  // 12. Notification
  await Notification.create({
    recipient: artistUser._id,
    sender: buyerUser._id,
    type: 'like',
    message: 'art_collector liked your artwork "Starry Night Over The Rhone"',
    isRead: false
  });

  console.log('\n====================================================');
  console.log('🌟 Realistic Dummy Data Seeded Successfully! 🌟');
  console.log('====================================================');
  console.log('Demo Test Credentials:');
  console.log('1. Admin:    email: admin@artory.com     | password: Admin@123');
  console.log('2. Artist:   email: vincent@artory.com   | password: Artist@123');
  console.log('3. Buyer:    email: collector@artory.com | password: Buyer@123');
  console.log('====================================================\n');
}

async function seedDatabase() {
  console.log('====================================================');
  console.log('🚀 Artory Database Seeder');
  console.log('====================================================');
  console.log(`Target MongoDB: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB successfully.\n');

    const db = mongoose.connection.db;

    // Search for existing seed_data.json
    let existingSeedPath = null;
    for (const testPath of SEED_FILE_PATHS) {
      if (fs.existsSync(testPath)) {
        existingSeedPath = testPath;
        break;
      }
    }

    if (existingSeedPath) {
      console.log(`✨ Found seed file at: ${existingSeedPath}`);
      await seedFromJson(existingSeedPath, db);
    } else {
      await seedRealisticDefaults(db);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedDatabase();
