const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()
const path = require('path');
const os = require('os');
const fs = require('fs');
const csv = require('csv-parser');

exports.processCSVUpload = functions.storage.object().onFinalize(
  async (object) => {

    console.log("metadata keys", Object.keys(object.metadata));

    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.

    // Get the file name.
    const datasetID = path.basename(filePath);

    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), datasetID);

    await bucket.file(filePath).download({destination: tempFilePath});
    console.log('File downloaded locally to', tempFilePath);

    let db = admin.firestore();
    let dataset = db.collection('datasets').doc(datasetID);
    let highlights = dataset.collection('highlights');

    // Read the CSV.
    let batchSize = 250;  // batched writes can contain up to 500 operations
    let batch = db.batch();
    let count = 0;

    let writeBatch = function() {
      let numOps = count;

      let result = batch.commit()
        .then(function() {
          console.log(`## writeBatch: wrote batch of size ${numOps}`)
        })
        .catch(function(error) {
          console.error("## writeBatch: failed to write batch", error);
        });

      batch = db.batch();
      count = 0;

      return result;
    }

    let batchPromises = [];

    let handleRow = function(row) {
      let highlightRef = highlights.doc();
      batch.set(highlightRef, row);
      count++;

      if (count == batchSize) {
        batchPromises.push(writeBatch());
      }
    };

    // Read the CSV and create a record for each row.
    fs.createReadStream(tempFilePath)
      .pipe(csv())
      .on('data', handleRow)
      .on('end', () => {
        console.log('Done processing CSV file');
      });

    batchPromises.push(writeBatch());

    let promiseCount = batchPromises.length;

    return Promise.all(batchPromises).then(function() {
      let now = new Date();
      return dataset.set({
        processedAt: now.toISOString()
      }, {merge: true});
    }).then(function() {
      return fs.unlinkSync(tempFilePath);
    });
  }
);
