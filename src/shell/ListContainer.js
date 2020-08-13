import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles((theme) => ({
  list: {
    position: "relative",
    borderRight: "1px solid " + theme.palette.divider,
    height: "calc(100vh - 64px)",
  },
}));

export default function ListContainer(props) {
  const classes = useStyles();

  return (
    <Grid container item md={3} xl={2} className={classes.list}>
      {props.children}
    </Grid>
  );
}
