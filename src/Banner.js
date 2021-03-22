import React from "react";

export default function Banner() {
  let now = new Date();
  let end = new Date("2021-04-11");
  let accessMs = end.getTime() - now.getTime();
  let accessDays = Math.ceil(accessMs / (1000 * 3600 * 24));

  return (
    <div
      style={{
        position: "fixed",
        zIndex: "2147483003",
        bottom: 0,
        height: "14rem",
        width: "100%",
        backgroundColor: "white",
        boxShadow:
          "rgba(0, 0, 0, 0.2) 0px 2px 1px -1px, rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 1px 3px 0px",
      }}
    >
      <div
        style={{
          padding: "2rem",
        }}
      >
        <h4>
          Your CustomerDB access ends{" "}
          {accessDays > 0 ? (
            <>
              in {accessDays} day{accessDays > 1 && "s"}.
            </>
          ) : (
            <>very soon!</>
          )}
        </h4>
        <p>
          We had a blast serving you, but unfortunately we are shutting down
          during the coming weeks.
        </p>
        <p>
          Click <a href="/orgs">here</a> to download a copy of your data. You
          can email us at{" "}
          <a href="mailto:founders@quantap.com">founders@quantap.com</a> if you
          have any questions.
        </p>
        <br />
        <p>
          <b>Note:</b> after <b>April 11th</b>, we won't be able to guarantee
          access to your data.
        </p>
      </div>
    </div>
  );
}
