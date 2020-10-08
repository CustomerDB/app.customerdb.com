import React, { useEffect, useState } from "react";

import Archive from "@material-ui/icons/Archive";
import Avatar from "react-avatar";
import Badge from "react-bootstrap/Badge";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Col from "react-bootstrap/Col";
import Create from "@material-ui/icons/Create";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import ImageDialog from "./ImageDialog.js";
import Linkify from "react-linkify";
import { Loading } from "../util/Utils.js";
import PersonData from "./PersonData.js";
import PersonDeleteDialog from "./PersonDeleteDialog.js";
import PersonEditDialog from "./PersonEditDialog.js";
import PersonHighlightsPane from "./PersonHighlightsPane.js";
import Row from "react-bootstrap/Row";
import Scrollable from "../shell/Scrollable.js";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import { useNavigate } from "react-router-dom";

const useStyles = makeStyles({
  nameCard: {
    margin: "0.5rem",
    padding: "0.5rem",
    textAlign: "center",
    alignItems: "center",
  },
  contactCard: {
    overflowWrap: "break-word",
    margin: "0.5rem",
    padding: "0.5rem",
  },
  main: {
    margin: "0.5rem",
    padding: "0.5rem",
  },
});

export default function Person(props) {
  const { personRef } = useFirestore();
  const [person, setPerson] = useState();
  const navigate = useNavigate();

  const [showLabels, setShowLabels] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const classes = useStyles();

  useEffect(() => {
    if (!personRef) {
      return;
    }
    return personRef.onSnapshot((doc) => {
      if (!doc.exists) {
        navigate("/404");
        return;
      }
      let person = doc.data();
      person.ID = doc.id;
      setPerson(person);
    });
  }, [personRef, navigate]);

  useEffect(() => {
    if (!person) {
      return;
    }
    setShowLabels(person.labels && Object.values(person.labels).length > 0);

    setShowContact(
      person.email ||
        person.phone ||
        person.state ||
        person.city ||
        person.country ||
        (person.customFields && Object.keys(person.customFields).length > 0)
    );
    console.log(person);
  }, [person]);

  if (!person) {
    return <Loading />;
  }

  let editDialog = (
    <PersonEditDialog
      show={showEditDialog}
      onHide={() => setShowEditDialog(false)}
      personRef={personRef}
    />
  );
  let deleteDialog = (
    <PersonDeleteDialog
      show={showDeleteDialog}
      onHide={() => setShowDeleteDialog(false)}
      personRef={personRef}
    />
  );

  return (
    <>
      <Grid container item md={12} lg={9} xl={10} spacing={0}>
        <Grid
          container
          item
          md={4}
          xl={3}
          direction="column"
          justify="flex-start"
          alignItems="stretch"
          spacing={0}
          style={{
            overflowX: "hidden",
            paddingTop: "1rem",
          }}
        >
          <Card className={classes.nameCard}>
            <CardContent>
              <div style={{ position: "relative" }}>
                <Avatar
                  size={70}
                  name={person.name}
                  src={person.imageData}
                  round={true}
                />
                <div
                  class="profileImageCover"
                  onClick={() => {
                    setImageDialogOpen(true);
                  }}
                >
                  Upload
                </div>
              </div>
              <ImageDialog
                open={imageDialogOpen}
                setOpen={setImageDialogOpen}
              />
              <Typography gutterBottom variant="h5" component="h2">
                {person.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" component="p">
                {person.job}
                <br />
                {person.company}
              </Typography>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "0.5rem",
                }}
              >
                <IconButton
                  color="primary"
                  aria-label="Archive person"
                  component="span"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Archive />
                </IconButton>
                <IconButton
                  color="primary"
                  aria-label="Edit person"
                  component="span"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Create />
                </IconButton>
              </div>
            </CardContent>
          </Card>
          {showContact && (
            <Card className={classes.contactCard}>
              <Typography gutterBottom variant="h6" component="h2">
                Contact
              </Typography>
              {person.email && (
                <Field name="Email">{<Linkify>{person.email}</Linkify>}</Field>
              )}
              <Field name="Phone">{person.phone}</Field>
              <Field name="Country">{person.country}</Field>
              <Field name="State">{person.state}</Field>
              <Field name="City">{person.city}</Field>
              {person.customFields &&
                Object.values(person.customFields).map((field) => (
                  <Field name={field.kind}>
                    <Linkify>{field.value}</Linkify>
                  </Field>
                ))}
            </Card>
          )}
          {showLabels && (
            <Card className={classes.contactCard}>
              <Typography gutterBottom variant="h6" component="h2">
                Labels
              </Typography>
              <Field>
                {Object.values(person.labels).map((label) => {
                  return <Label name={label.name} />;
                })}
              </Field>
            </Card>
          )}
          <PersonData person={person} />
        </Grid>

        <Grid
          style={{ position: "relative", height: "100%" }}
          container
          item
          sm={12}
          md={8}
          xl={9}
        >
          <Scrollable>
            <Grid container item spacing={0} xs={12}>
              <PersonHighlightsPane person={person} />
            </Grid>
          </Scrollable>
        </Grid>
        {editDialog}
        {deleteDialog}
      </Grid>
    </>
  );
}

function Label(props) {
  return (
    <Badge
      key={props.name}
      pill
      variant="secondary"
      style={{ marginRight: "0.5rem" }}
    >
      {props.name}
    </Badge>
  );
}

function Field(props) {
  if (!props.children) {
    return <></>;
  }

  return (
    <Row key={props.name} noGutters={true}>
      <Col>
        <p style={{ margin: 0 }}>
          <small>{props.name}</small>
        </p>
        <p>{props.children}</p>
      </Col>
    </Row>
  );
}
