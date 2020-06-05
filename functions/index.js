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

		let batchSize = 250;  // batched writes can contain up to 500 operations
		var batch = db.batch();
		var count = 0;

		var writeBatch = function() {
				if (count == 0) return;

				batch.commit()
					.then(function() {
						console.log(`wrote batch of size ${count}`)
						batch = db.batch();
					})
					.catch(function(error) {
						console.error("failed to write batch", error);
					});

				batch = db.batch();
				count = 0;
		}

		var handleRow = function(row) {
			highlightRef = highlights.doc();
			batch.set(highlightRef, row);
			count++;

			if (count == batchSize) {
				writeBatch();
			}
		};

		// Read the CSV and create a record for each row.
		return fs.createReadStream(tempFilePath)
			.pipe(csv())
			.on('data', handleRow)
			.on('end', () => {

				console.log('Done processing CSV file');

				// Commit last batch of writes
				writeBatch();

				// Mark the dataset as done processing
				let now = new Date();
				dataset.set({
					processedAt: now.toISOString()
				}, {merge: true});

				// Delete the local file to free up disk space.
				return fs.unlinkSync(tempFilePath);
			});
  }
);
