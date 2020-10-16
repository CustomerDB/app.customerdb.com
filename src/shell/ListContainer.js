import Grid from "@material-ui/core/Grid";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  list: {
    position: "relative",
    borderRight: "1px solid " + theme.palette.divider,
    height: "100%",
  },
}));

export default function ListContainer({ sm, children, ...otherProps }) {
  const classes = useStyles();

  let containerSm = sm || 12;

  return (
    <Grid
      container
      item
      sm={containerSm}
      md={3}
      xl={2}
      className={classes.list}
    >
      {children}
    </Grid>
  );
}
