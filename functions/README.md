## Hints

To debug the csv parser:

```
exports.debug = functions.https.onRequest((req, res) => {
	let dataset = db.collection('datasets').doc("debug");
	parseCSV(dataset, "./test-2.csv").then(() => {
		res.status(200).send("OK");
	}).catch((e) => {
		res.status(200).send("NOT OK: " + e);
	})
})
```
