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
import "intersection-observer"; // optional polyfill (webkit)

export default class Infinite extends React.Component {
  sentinel = null;

  onSentinelIntersection = (entries) => {
    const { hasMore, onLoad } = this.props;

    entries.forEach((entry) => {
      if (entry.isIntersecting && hasMore) {
        onLoad();
      }
    });
  };

  componentDidMount() {
    // NOTE: If less data is loaded than what would put the sentinel out of the current viewport, the onLoad won't be triggered.
    this.observer = new IntersectionObserver(this.onSentinelIntersection);
    this.observer.observe(this.sentinel);
  }

  componentWillUnmount() {
    this.observer.disconnect();
  }

  render() {
    return (
      <>
        {this.props.children}
        <div ref={(c) => (this.sentinel = c)} />
      </>
    );
  }
}
