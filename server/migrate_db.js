const { MongoClient } = require('mongodb');

const localUri = "mongodb://localhost:27017/artory";
const atlasUri = "mongodb+srv://prajwalmeshram231162_db_user:0V1XPlyD4ee9Y5Px@artory.qg5ni83.mongodb.net/artory?retryWrites=true&w=majority&appName=artory";

async function migrate() {
  let localClient, atlasClient;

  try {
    console.log("Connecting to local MongoDB...");
    localClient = await MongoClient.connect(localUri);
    const localDb = localClient.db('artory');

    console.log("Connecting to Atlas MongoDB...");
    atlasClient = await MongoClient.connect(atlasUri);
    const atlasDb = atlasClient.db('artory');

    // Get all collections from local DB
    const collections = await localDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections locally.`);

    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`\nMigrating collection: ${collName}`);

      const localColl = localDb.collection(collName);
      const atlasColl = atlasDb.collection(collName);

      // Fetch all documents from local
      const docs = await localColl.find({}).toArray();
      console.log(`  - Found ${docs.length} documents.`);

      if (docs.length > 0) {
        // Clear existing data in atlas just in case (optional, but good for fresh sync)
        await atlasColl.deleteMany({});
        
        // Insert into Atlas
        const result = await atlasColl.insertMany(docs);
        console.log(`  - Successfully inserted ${result.insertedCount} documents into Atlas.`);
      } else {
        console.log(`  - Skipped (empty).`);
      }
    }

    console.log("\nMigration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

migrate();
