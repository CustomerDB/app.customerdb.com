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
import colorPair from "../util/color.js";
import { now } from "../util/Utils.js";

function Pointer(props) {
  return (
    <svg
      version="1.1"
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512.011 512.011"
      style={{
        position: "absolute",
        height: "80px",
        top: props.y,
        left: props.x,
      }}
    >
      <path
        style={{ fill: props.fill }}
        d="M434.215,344.467L92.881,3.134c-4.16-4.171-10.914-4.179-15.085-0.019
        c-2.011,2.006-3.139,4.731-3.134,7.571v490.667c0.003,4.382,2.685,8.316,6.763,9.92c4.081,1.603,8.727,0.545,11.712-2.667
        l135.509-145.92h198.016c5.891,0.011,10.675-4.757,10.686-10.648C437.353,349.198,436.226,346.473,434.215,344.467z"
      />
    </svg>
  );
}

class Pointers extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mouseX: undefined,
      mouseY: undefined,
      lastMouseX: undefined,
      lastMouseY: undefined,
      positions: {},
    };

    this.subscriptions = [];
  }
  componentDidMount() {
    setInterval((event) => {
      if (this.state.mouseX === undefined || this.state.mouseY === undefined) {
        return;
      }

      if (
        this.state.lastMouseX === this.state.mouseX &&
        this.state.lastMouseY === this.state.mouseY
      ) {
        return;
      }

      let uid = this.props.user.ID;
      this.props.activeUsersRef.doc(uid).set({
        userId: uid,
        x: this.state.mouseX,
        y: this.state.mouseY,
        lastModified: now(),
      });

      this.state.lastMouseX = this.state.mouseX;
      this.state.lastMouseY = this.state.mouseY;
    }, 500);

    document.addEventListener("mousemove", (event) => {
      this.state.mouseX = event.clientX;
      this.state.mouseY = event.clientY;
    });

    let pointerHandler = (pointers) => {
      let positions = this.state.positions;
      pointers.forEach((pointer) => {
        let data = pointer.data();

        if (!positions.hasOwnProperty(data.userId)) {
          let colors = colorPair();
          positions[data.userId] = {
            fill: colors.background,
          };
        }

        positions[data.userId]["userId"] = data["userId"];
        positions[data.userId]["x"] = data["x"];
        positions[data.userId]["y"] = data["y"];
      });
      this.setState({
        positions: positions,
      });
    };

    this.subscriptions.push(
      this.props.activeUsersRef
        .where("userId", ">", this.props.user.ID)
        .onSnapshot(pointerHandler)
    );

    this.subscriptions.push(
      this.props.activeUsersRef
        .where("userId", "<", this.props.user.ID)
        .onSnapshot(pointerHandler)
    );
  }

  componentWillUnmount() {
    this.subscriptions.forEach((subscription) => subscription());
    this.subscriptions = [];
  }

  render() {
    let pointers = Object.values(this.state.positions).map((pointer) => {
      return (
        <Pointer
          key={pointer.userId}
          fill={pointer.fill}
          x={pointer.x}
          y={pointer.y}
        />
      );
    });
    console.debug(`Pointers found: ${pointers.length}`);
    return <>{pointers}</>;
  }
}

export default Pointers;
