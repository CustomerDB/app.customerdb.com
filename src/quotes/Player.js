// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
