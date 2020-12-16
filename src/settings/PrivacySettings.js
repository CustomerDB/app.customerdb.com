import React from "react";

import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function PrivacySettings() {
  const classes = useStyles();

  return (
    <Grid container item xs={12} spacing={0} justify="center">
      <Card className={classes.fullWidthCard}>
        <CardContent>
          <Button onClick={() => window.displayPreferenceModal()}>
            Manage Cookie Preferences
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );
}
