const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()
const path = require('path');
const os = require('os');
const fs = require('fs');
const csv = require('csv-parser');

exports.processCSVUpload = functions.storage.object().onFinalize((object) => {
	const fileBucket = object.bucket; // The Storage bucket that contains the file.
	const filePath = object.name; // File path in the bucket.

	// Get the file name.
	const datasetID = path.basename(filePath);

	const bucket = admin.storage().bucket(fileBucket);
	const tempFilePath = path.join(os.tmpdir(), datasetID);

	let db = admin.firestore();
	let dataset = db.collection('datasets').doc(datasetID);
	let highlights = dataset.collection('highlights');

	// Read the CSV.
	let batch = db.batch();
	let batchSize = 250;  // batched writes can contain up to 500 operations
	let batchPromises = [];
	let count = 0;
	let batchNum = 1;

	let download = bucket.file(filePath).download({destination: tempFilePath});
	return download.then(function() {
		return new Promise(function (resolve, reject) {
			console.log("read csv")

			fs.createReadStream(tempFilePath)
				.pipe(csv())
				.on('data', function(row) {
					let highlightRef = highlights.doc();
					batch.set(highlightRef, row);
					count++;

					if (count == batchSize) {
						console.log(`Batch commit ${batchNum}`);
						batchPromises.push(batch.commit());
						batch = db.batch();
						count = 0;
						batchNum++;
					}
				})
				.on('end', () => {
					console.log('Done processing CSV file');
					batchPromises.push(batch.commit());
					resolve(Promise.all(batchPromises));
				});
		})
	})
	.then(function() {
		console.log("Recording processed timestamp");
		let now = new Date();
		return dataset.set({
			processedAt: now.toISOString()
		}, {merge: true});
	})
	.then(function() {
		console.log("Deleting temporary file");
		return fs.unlinkSync(tempFilePath);
	})
}
);
