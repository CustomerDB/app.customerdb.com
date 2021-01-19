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
