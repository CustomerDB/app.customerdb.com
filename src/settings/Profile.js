import React, { useContext, useEffect, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import ContentEditable from "react-contenteditable";
import Grid from "@material-ui/core/Grid";
import Linkify from "react-linkify";
import Scrollable from "../shell/Scrollable.js";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    minHeight: "24rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function Profile(props) {
  const auth = useContext(UserAuthContext);
  const { membersRef } = useFirestore();
  const [displayName, setDisplayName] = useState();
  const [memberRef, setMemberRef] = useState();

  const classes = useStyles();

  useEffect(() => {
    if (!membersRef || !auth.oauthClaims || !auth.oauthClaims.email) {
      return;
    }

    let ref = membersRef.doc(auth.oauthClaims.email);

    setMemberRef(ref);

    return ref.onSnapshot((doc) => {
      let data = doc.data();
      setDisplayName(data.displayName);
    });
  }, [auth.oauthClaims.email, membersRef, auth.oauthClaims]);

  return (
    <Grid
      container
      item
      xs={12}
      spacing={0}
      justify="center"
      style={{ position: "relative" }}
    >
      <Scrollable>
        <Card className={classes.fullWidthCard}>
          <CardContent>
            <Grid
              container
              item
              direction="column"
              justify="flex-start"
              alignItems="center"
              spacing={2}
            >
              <Grid item>
                <Avatar
                  style={{ height: "10rem", width: "10rem" }}
                  alt={displayName}
                  src={auth.oauthClaims.picture}
                />
              </Grid>
              <Grid item>
                <Typography align="center" variant="h4" component="h2">
                  <ContentEditable
                    id="displayName"
                    html={displayName ? displayName : ""}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.target.blur();
                      }
                    }}
                    onBlur={(e) => {
                      if (memberRef) {
                        let newName = e.target.innerText
                          .replace(/(\r\n|\n|\r)/gm, " ")
                          .replace(/\s+/g, " ")
                          .trim();

                        console.debug("setting member name", newName);

                        memberRef.set(
                          { displayName: newName },
                          { merge: true }
                        );
                      }
                    }}
                  />
                </Typography>
                <Typography
                  gutterBottom
                  align="center"
                  variant="h5"
                  component="h2"
                >
                  <Linkify>{auth.oauthClaims.email}</Linkify>
                </Typography>
                <Typography
                  gutterBottom
                  align="center"
                  variant="body2"
                  component="p"
                >
                  {auth.oauthClaims.admin ? "Administrator" : "Member"}
                </Typography>
              </Grid>
              <Grid item></Grid>
            </Grid>
          </CardContent>
          <CardActions>
            <Button onClick={() => window.displayPreferenceModal()}>
              Manage Cookie Preferences
            </Button>
          </CardActions>
        </Card>
      </Scrollable>
    </Grid>
  );
}
