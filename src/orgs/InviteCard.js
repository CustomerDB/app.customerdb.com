import React from "react";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { Link } from "react-router-dom";

export default function InviteCard({ orgID, orgName, inviteSentTimestamp }) {
  const linkedTitle = orgID && orgName && (
    <Link style={{ color: "black" }} to={`/orgs/${orgID}`}>
      {orgName}
    </Link>
  );

  const onAccept = (e) => {
    console.debug("TODO: accept");
  };

  const onIgnore = (e) => {
    console.debug("TODO: ignore");
  };

  return (
    <Grid container item>
      <Card
        style={{
          margin: "1rem",
          borderRadius: "0.5rem",
          maxHeight: "10rem",
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
            {linkedTitle}
          </Typography>
          <CardActions>
            <Button size="small" variant="outlined" onClick={onAccept}>
              Accept
            </Button>
            <Button size="small" variant="outlined" onClick={onIgnore}>
              Ignore
            </Button>
          </CardActions>
        </CardContent>
      </Card>
    </Grid>
  );
}
