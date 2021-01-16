import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import TextField from "@material-ui/core/TextField";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function OrgSettings(props) {
  const { orgRef } = useFirestore();
  const [changeName, setChangeName] = useState();

  useEffect(() => {
    if (!orgRef) {
      return;
    }

    return orgRef.onSnapshot((doc) => {
      let o = doc.data();
      setChangeName(o.name);
    });
  }, [orgRef]);

  const classes = useStyles();

  return (
    <Grid container item xs={12} spacing={0} justify="center">
      <Card className={classes.fullWidthCard}>
        <CardContent>
          <Grid
            container
            item
            justify="flex-start"
            alignItems="center"
            spacing={2}
            xs={12}
          >
            <Grid container item xs={12}>
              <Grid container item xs={12} alignItems="center">
                <Grid item xs={10}>
                  <p>
                    <b>Organization Name</b>
                  </p>
                  <TextField
                    value={changeName}
                    onChange={(event) => {
                      setChangeName(event.target.value);
                    }}
                  />
                </Grid>
                <Grid item xs={2} style={{ paddingTop: "2rem" }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      orgRef.update({
                        name: changeName,
                      });
                    }}
                  >
                    Save changes
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
}
