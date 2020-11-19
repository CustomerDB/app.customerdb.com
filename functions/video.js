const functions = require("firebase-functions");
const glob = require("glob");
const tmp = require("tmp");
const admin = require("firebase-admin");
const spawn = require("child-process-promise").spawn;
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { v4: uuidv4 } = require("uuid");
const mediainfo = require("node-mediainfo");

const generateFromVideo = (file, imageHeight, outputPrefix) => {
  // ffmpeg -i input.mp4 -f image2 -vf fps=1/10,scale=-1:192 thumb-%d.png

  const videoobj = tmp.fileSync();
  return file
    .download({
      destination: videoobj.name,
    })
    .then(() => {
      const promise = spawn(ffmpegPath, [
        "-i",
        videoobj.name,
        "-f",
        "image2",
        "-vf",
        `fps=1/10,scale=-1:${imageHeight}`,
        `${outputPrefix}/thumb-%d.png`,
      ]);
      promise.childProcess.stdout.on("data", (data) =>
        console.info("[spawn] stdout: ", data.toString())
      );
      promise.childProcess.stderr.on("data", (data) =>
        console.info("[spawn] stderr: ", data.toString())
      );
      return promise;
    });
};

exports.ensureCBRVersion = functions.storage.object().onFinalize((object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  let matches = filePath.match(/(.+)\/transcriptions\/(.+)\/input\/(.+)/);

  if (!matches || matches.length != 4) {
    return;
  }

  if (!contentType.startsWith("video/") && !contentType.startsWith("audio/")) {
    console.log(
      "object content type is not video or audio -- skipping",
      contentType
    );
    return;
  }

  const videoobj = tmp.fileSync();
  return admin
    .storage()
    .bucket()
    .file(filePath)
    .download({
      destination: videoobj.name,
    })
    .then(() => {
      return mediainfo(videoobj.name).then((result) => {
        let tracks = result.media.track;
        let vbr = false;

        tracks.forEach((track) => {
          if (
            track.OverallBitRate_Mode === "VBR" ||
            track.BitRate_Mode === "VBR"
          ) {
            vbr = true;
          }
        });

        console.log(`${filePath} vbr: ${vbr}`);
      });
    });
});

exports.renderThumbnails = functions.storage
  .object()
  .onFinalize(async (object) => {
    let db = admin.firestore();

    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    console.log(`bucket ${fileBucket} path ${filePath} type ${contentType}`);

    let matches = filePath.match(/(.+)\/transcriptions\/(.+)\/input\/(.+)/);

    if (!matches || matches.length != 4) {
      return;
    }

    if (!contentType.startsWith("video/")) {
      console.log("object content type is not video -- skipping", contentType);
      return;
    }

    let orgID = matches[1];
    let transcriptionID = matches[2];

    return db
      .collection("organizations")
      .doc(orgID)
      .collection("transcriptions")
      .doc(transcriptionID)
      .update({
        thumbnailRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  });

// Periodically generate videos without thumbnails:
//
// Function one: mark periodically
// - For every transcription with mediaType video and empty thumbnailToken:
//   If thumbnailRequestedTimestamp is missing or too old:
//     set thumbnailRequestedTimestamp to now.

exports.markTranscriptsForThumbnail = functions.pubsub
  .schedule("every 15 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    return db
      .collectionGroup("transcriptions")
      .where("mediaType", "==", "video")
      .where("thumbnailToken", "==", "")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((doc) => {
            let data = doc.data();
            if (data.thumbnailRequestedTimestamp) {
              const now = new Date();
              const oldRequestTime = data.thumbnailRequestedTimestamp.toDate();
              const elapsedMillis = now.getTime() - oldRequestTime.getTime();
              // nb: 30m
              const minAge = 30 * 60 * 1000;
              if (elapsedMillis <= minAge) {
                return;
              }
            }

            return doc.ref.update({
              thumbnailRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          })
        );
      });
  });

// Function two: trigger
// - If thumbnailToken is set, return.
// - Do thumbnail rendering
// - Set thumbnailToken
exports.renderThumbnailsForTranscription = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "2GB",
  })
  .firestore.document("organizations/{orgID}/transcriptions/{transcriptionID}")
  .onUpdate((change, context) => {
    console.log("handling update (params):", context.params);

    const transcription = change.after.data();

    if (
      !transcription.inputPath ||
      !transcription.mediaType ||
      !transcription.mediaType === "video" ||
      transcription.thumbnailToken ||
      !transcription.thumbnailRequestedTimestamp
    ) {
      return;
    }

    let { orgID, transcriptionID } = context.params;

    // Create temp directory
    const tmpobj = tmp.dirSync();
    console.log("using tmp dir: ", tmpobj.name);

    // Generate thumbnail images for every 10s of video.
    let imageHeight = 192;
    let file = admin.storage().bucket().file(transcription.inputPath);

    let token = uuidv4();

    return generateFromVideo(file, imageHeight, tmpobj.name)
      .then(() => {
        // Upload thumbnails to cloud storage
        let thumbnailUploadPrefix = `${orgID}/transcriptions/${transcriptionID}/output/thumbnails`;

        console.debug("thumbnailUploadPrefix", thumbnailUploadPrefix);
        let files = glob.sync(`${tmpobj.name}/*.png`);
        return Promise.all(
          files.map((thumbPath) => {
            console.debug("thumbPath", thumbPath);
            let name = thumbPath.slice(tmpobj.name.length);
            let destination = `${thumbnailUploadPrefix}${name}`;
            console.debug("name", name);
            console.debug("destination", destination);

            return admin
              .storage()
              .bucket()
              .upload(thumbPath, {
                destination: destination,
                metadata: {
                  cacheControl: "max-age=31536000",
                  metadata: {
                    firebaseStorageDownloadTokens: token,
                  },
                },
              })
              .then(() => change.after.ref.update({ thumbnailToken: token }));
          })
        );
      })
      .catch((error) => {
        console.warn("failed to generate thumbnails", error);
      });
  });
