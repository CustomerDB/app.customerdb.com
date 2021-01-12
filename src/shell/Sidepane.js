import React from "react";

import KeyboardTabIcon from "@material-ui/icons/KeyboardTab";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";

export default function Sidepane({ title, open, setOpen, width, children }) {
  const openWidth = width || "30rem";

  return (
    <Grid
      container
      style={{
        position: "absolute",
        borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
        boxShadow:
          "rgba(0, 0, 0, 0.2) 0px 2px 1px -1px, rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 1px 3px 0px",
        backgroundColor: "white",
        height: "100%",
        top: 0,
        right: 0,
        width: open ? openWidth : "0rem",
        overflow: "hidden",
        transition: "width 0.5s",
        zIndex: 300,
      }}
    >
      <Grid
        container
        style={{ width: openWidth }}
        alignItems="flex-start"
        direction="column"
        justify="flex-start"
      >
        <Grid container item alignItems="center" style={{ padding: "2rem" }}>
          <Grid container item xs={10}>
            <Typography variant="h6" style={{ fontWeight: "bold" }}>
              {title}
            </Typography>
          </Grid>
          <Grid container item xs={2}>
            <IconButton
              onClick={() => {
                setOpen(false);
              }}
            >
              <KeyboardTabIcon />
            </IconButton>
          </Grid>
        </Grid>
        {children}
      </Grid>
    </Grid>
  );
}
