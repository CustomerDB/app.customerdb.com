import Grid from "@material-ui/core/Grid";
import React from "react";
import quotesIllustration from "../assets/images/quotes.svg";
import { makeStyles } from "@material-ui/core/styles";

import { useParams } from "react-router-dom";
import { Link } from "@material-ui/core";

const useStyles = makeStyles({
  helpText: {
    padding: "2rem",
  },
});

export default function QuotesHelp(props) {
  const classes = useStyles();

  const { orgID } = useParams();

  return (
    <Grid
      container
      item
      md={9}
      xl={10}
      direction="row"
      justify="center"
      alignItems="center"
    >
      <Grid container item md={5} lg={4}>
        <img
          style={{ width: "100%" }}
          src={quotesIllustration}
          alt="Contents illustration"
        />
      </Grid>
      <Grid item md={5} lg={4} className={classes.helpText}>
        <h3>Hear directly from your customers</h3>
        <br />
        <h5>
          Customer quotes you highlight in{" "}
          <Link href={`/orgs/${orgID}/interviews`}>your interviews</Link> appear
          here.
        </h5>
      </Grid>
    </Grid>
  );
}
