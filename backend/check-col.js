const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://user1:hTebD8k6c57q0sXp@localsmhire.i23h9.mongodb.net/LocalSMHire?retryWrites=true&w=majority')
.then(async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(collections.map(c => c.name));
  process.exit(0);
});
