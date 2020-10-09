const functions = require("firebase-functions");
const glob = require("glob");
const tmp = require("tmp");
const spawn = require("child-process-promise").spawn;
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

const generateFromVideo = (file, imageHeight, outputPrefix) => {
  // ffmpeg -i input.mp4 -f image2 -vf fps=1/10,scale=-1:192 thumb-%d.png

  return file
    .getSignedUrl({ action: "read", expires: "05-24-2999" })
    .then((signedUrl) => {
      const fileUrl = signedUrl[0];
      const promise = spawn(ffmpegPath, [
        "-i",
        fileUrl,
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

exports.renderThumbnails = functions.storage
  .object()
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
    generateFromVideo(object, imageHeight, tmpobj.name)
      .then(() => {
        // Upload thumbnails to cloud storage
        let thumbnailUploadPrefix = `${orgID}/transcriptions/${transcriptionID}/output/thumbnails`;
        let opts = {};
        return glob(`${tmpobj.name}/*.png`, opts, (err, files) => {
          if (err) {
            console.error("failed to list thumbnail images", err);
            return;
          }
          return Promise.all(
            files.map((thumbPath) => {
              let name = thumbPath.slice(tmpobj.name.length);
              return admin
                .storage()
                .bucket()
                .upload(thumbPath, {
                  destination: `${thumbnailUploadPrefix}/${name}`,
                });
            })
          );
        });
      })
      .then(tmpobj.removeCallback);
  });
