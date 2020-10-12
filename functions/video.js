const functions = require("firebase-functions");
const glob = require("glob");
const tmp = require("tmp");
const admin = require("firebase-admin");
const spawn = require("child-process-promise").spawn;
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { v4: uuidv4 } = require("uuid");

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

exports.renderThumbnails = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
  })
  .storage.object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    console.log(`bucket ${fileBucket} path ${filePath} type ${contentType}`);

    let matches = filePath.match(/(.+)\/transcriptions\/(.+)\/input\/(.+)/);

    if (!matches || matches.length != 4) {
      console.log(
        "File path doesn't match pattern for image thumbnails: ",
        filePath
      );
      return;
    }

    if (!contentType.startsWith("video/")) {
      console.log("object content type is not video -- skipping", contentType);
      return;
    }

    let orgID = matches[1];
    let transcriptionID = matches[2];

    // Create temp directory
    const tmpobj = tmp.dirSync();
    console.log("using tmp dir: ", tmpobj.name);

    // Generate thumbnail images for every 10s of video.
    let imageHeight = 192;
    let file = admin.storage().bucket().file(filePath);

    let db = admin.firestore();
    let token = uuidv4();

    return generateFromVideo(file, imageHeight, tmpobj.name).then(() => {
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
            .then(() =>
              db
                .collection("organizations")
                .doc(orgID)
                .collection("transcriptions")
                .doc(transcriptionID)
                .set({ thumbnailToken: token }, { merge: true })
            );
        })
      );
    });
  });

// One time.
// TODO: Create empty thumbnail token field in transcription (without it already set)

// Repair old videos without thumbnails
// TODO: Go through each org
// TODO: Get transcriptions without thumbnailToken
// TODO: Mark for thumbnailing
