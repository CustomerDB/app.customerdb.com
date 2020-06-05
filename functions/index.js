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
		const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1

		// Get the file name.
		const datasetID = path.basename(filePath);

		const bucket = admin.storage().bucket(fileBucket);
		const tempFilePath = path.join(os.tmpdir(), datasetID);
		const metadata = {
			contentType: contentType,
		};

		await bucket.file(filePath).download({destination: tempFilePath});
		console.log('File downloaded locally to', tempFilePath);

		let db = admin.firestore();
		highlights = db.collection(`datasets/${datasetID}/highlights`);

		// Read the CSV.
		fs.createReadStream(tempFilePath)
			.pipe(csv())
			.on('data', (row) => {
				console.log(row);
				highlights.add(row)
					.then(function() { console.log("Inserted record"); })
					.catch(function(error) { console.error("Error inserting record"); });
			})
			.on('end', () => {
				console.log('Done processing CSV file');
			});

		// Create highlight records in firestore for each row of the CSV
		// todo

		// Once the thumbnail has been uploaded delete the local file to free up disk space.
		return fs.unlinkSync(tempFilePath);
  }
);
