require('dotenv').config();
const mongoose = require('mongoose');
const { translate } = require('@vitalets/google-translate-api');
const Artwork = require('./models/Artwork');

async function translateAll() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const artworks = await Artwork.find({});
    console.log(`Found ${artworks.length} artworks.`);
    
    let translatedCount = 0;
    for (const art of artworks) {
      if (art.description) {
        try {
          const res = await translate(art.description, { to: 'en' });
          if (res.text && res.text !== art.description) {
            art.description = res.text;
            await art.save();
            translatedCount++;
            console.log(`Translated artwork ID ${art._id}`);
          }
        } catch (e) {
          console.error(`Error translating artwork ${art._id}:`, e.message);
        }
      }
    }
    console.log(`Successfully translated ${translatedCount} artworks.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

translateAll();
