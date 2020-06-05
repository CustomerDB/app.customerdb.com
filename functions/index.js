const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

exports.processCSVUpload = functions.storage.object().onFinalize(
  async (object) => {
		const fileBucket = object.bucket; // The Storage bucket that contains the file.
		const filePath = object.name; // File path in the bucket.
		const contentType = object.contentType; // File content type.
		const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1

		// Get the file name.
		const fileName = path.basename(filePath);

		const bucket = admin.storage().bucket(fileBucket);
		const tempFilePath = path.join(os.tmpdir(), fileName);
		const metadata = {
			contentType: contentType,
		};

		await bucket.file(filePath).download({destination: tempFilePath});
		console.log('File downloaded locally to', tempFilePath);

		// Read the CSV.
		// todo

		// Create highlight records in firestore for each row of the CSV
		// todo

		// Once the thumbnail has been uploaded delete the local file to free up disk space.
		return fs.unlinkSync(tempFilePath);
  }
);
