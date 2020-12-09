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

export default function ListContainer({ children, ...otherProps }) {
  const classes = useStyles();

  return (
    <Grid container item xs={12} className={classes.list}>
      {children}
    </Grid>
  );
}
