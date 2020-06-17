const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()
const path = require('path');
const os = require('os');
const fs = require('fs');
const csv = require('csv-parser');

exports.parseCSV = function(db, dataset, tempFilePath) {
	let highlights = dataset.collection('highlights');

	// Read the CSV.
	let batch = db.batch();
	let batchSize = 250;  // batched writes can contain up to 500 operations
	let batchPromises = [];
	let count = 0;
	let batchNum = 1;
	let tags = {};

	return new Promise(function (resolve, reject) {
			console.log("Read csv ", tempFilePath)

			fs.createReadStream(tempFilePath)
				.pipe(csv())
				.on('data', function(row) {
					// Build a list of tags.
					// TODO: Make a required list of properties.
					if (!row.hasOwnProperty('Tag')) {
						console.error(new Error("Row missing 'Tag' field"))
						return;
					}

					// Empthy columns are not allowed in firestore.
					if (row.hasOwnProperty('')) {
						delete row[''];
					}

					let highlightRef = highlights.doc();
					batch.set(highlightRef, row);
					count++;

					let tag = row['Tag']
					if (!tags.hasOwnProperty(tag)) {
						tags[tag] = 0;
					}
					tags[tag]++;

					if (count == batchSize) {
						console.log(`Batch commit ${batchNum}`);
						batchPromises.push(batch.commit());
						batch = db.batch();
						count = 0;
						batchNum++;
					}
				})
				.on('end', () => {
					batchPromises.push(batch.commit());
					resolve(Promise.all(batchPromises));
				});
	}).then(function() {
		console.log("Recording processed timestamp");
		let now = new Date();
		return dataset.set({
			tags: Object.keys(tags),
			processedAt: now.toISOString()
		}, {merge: true});
	});
};

exports.processCSVUpload = functions.storage.object().onFinalize((object) => {
	let db = admin.firestore();

	const fileBucket = object.bucket; // The Storage bucket that contains the file.
	const filePath = object.name; // File path in the bucket.

	console.log("fileBucket: " + fileBucket);

	// Get the file name.
	const datasetID = path.basename(filePath);

	console.log(`Processing dataset ${datasetID}`);

	const bucket = admin.storage().bucket(fileBucket);
	const tempFilePath = path.join(os.tmpdir(), datasetID);

	let dataset = db.collection('datasets').doc(datasetID);

	let download = bucket.file(filePath).download({destination: tempFilePath});
	return download
		.then(() => { return exports.parseCSV(db, dataset, tempFilePath) })
		.then(function() {
			console.log("Deleting temporary file");
			return fs.unlinkSync(tempFilePath);
		});
}
);

exports.deleteDataset = functions.firestore
    .document('datasets/{datasetID}')
    .onUpdate((snap, context) => {
		let storage = admin.storage();
		let bucket = storage.bucket();
		let data = snap.after.data();

		if (data.hasOwnProperty('deletedAt') && data.hasOwnProperty('googleStoragePath')) {
			console.log("Deleting: " + data);
			return bucket.file(data.googleStoragePath).delete().then(function() {
				return snap.after.ref.delete();
			})
		}
});
