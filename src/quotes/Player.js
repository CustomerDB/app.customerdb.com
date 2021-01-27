import React from "react";
import ReactPlayer from "react-player";

export default function Player({ playerRef, mediaURL, highlight }) {
  if (!mediaURL) {
    return <></>;
  }

  return (
    <div
      style={{
        borderRadius: "0.5rem",
        overflow: "hidden",
        margin: "0.5rem",
        position: "relative",
      }}
    >
      <ReactPlayer
        ref={playerRef}
        url={mediaURL}
        width="100%"
        height={highlight.thumbnailURL ? "12rem" : "100%"}
        light={highlight.thumbnailURL || false}
        playing={highlight.thumbnailURL && true}
        onReady={() => {
          if (highlight.startTime && playerRef.current.getCurrentTime() === 0) {
            playerRef.current.seekTo(highlight.startTime);
          }
        }}
        controls
      />
    </div>
  );
}
