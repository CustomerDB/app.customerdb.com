// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useCallback, useContext, useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import Scrollable from "../shell/Scrollable.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { makeStyles } from "@material-ui/core/styles";
import papa from "papaparse";
import { useDropzone } from "react-dropzone";
import useFirestore from "../db/Firestore.js";
import { v4 as uuidv4 } from "uuid";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    minHeight: "24rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

function recordToPerson(firebase, record, creatorEmail) {
  let filtered = {};

  if (record) {
    filtered = {
      name: record.name || null,
      email: record.email || null,
      phone: record.phone || null,
      company: record.company || null,
      job: record.job || null,
      city: record.city || null,
      state: record.state || null,
      country: record.country || null,

      customFields: {},
      labels: [],

      createdBy: creatorEmail,
      creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      deletionTimestamp: "",
    };

    if (record.LinkedIn) {
      let fieldID = uuidv4();
      filtered.customFields[fieldID] = {
        ID: fieldID,
        kind: "LinkedIn",
        value: record.LinkedIn,
      };
    }

    if (record.Twitter) {
      let fieldID = uuidv4();
      filtered.customFields[fieldID] = {
        ID: fieldID,
        kind: "Twitter",
        value: record.Twitter,
      };
    }
  }

  return filtered;
}

export default function BulkImport(props) {
  const auth = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  const { peopleRef } = useFirestore();

  const [records, setRecords] = useState();
  const [randomRecord, setRandomRecord] = useState();
  const [importProgress, setImportProgress] = useState();

  const classes = useStyles();

  const chooseRandomRecord = () => {
    if (!records || records.length === 0) {
      setRandomRecord(undefined);
      return;
    }

    let index = Math.floor(Math.random() * records.length);
    setRandomRecord(records[index]);
  };

  useEffect(chooseRandomRecord, [records]);

  useEffect(() => {
    if (!peopleRef || !records || importProgress === undefined) {
      return;
    }

    const createPerson = (record) => {
      let personDocument = recordToPerson(
        firebase,
        record,
        auth.oauthClaims.email
      );

      if (!personDocument.name) {
        console.debug("skipping record (name missing)", record);
        setImportProgress(importProgress + 1);
        return;
      }

      console.log("importing record", record, personDocument);
      return peopleRef.add(personDocument).then(() => {
        setImportProgress(importProgress + 1);
      });
    };

    if (importProgress < records.length) {
      createPerson(records[importProgress]);
    }
  }, [importProgress, auth.oauthClaims.email, peopleRef, records, firebase]);

  const onParse = (results) => {
    console.log("finished", results.data);
    setRecords(results.data);
  };

  const onDrop = useCallback((acceptedFiles) => {
    console.log("onDrop", acceptedFiles);

    acceptedFiles.forEach((file) => {
      papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: onParse,
      });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!peopleRef) {
    return <Loading />;
  }

  let contactZone = (
    <Grid
      container
      item
      {...getRootProps()}
      style={{
        background: "#dedede",
        borderRadius: "0.25rem",
        width: "60%",
        minHeight: "8rem",
      }}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop contact CSV files here...</p>
      ) : (
        <p>Drag 'n' drop contact CSV files here, or click here to select</p>
      )}
    </Grid>
  );

  let instructions = (
    <>
      <Grid item md={4}>
        <p>Standard columns</p>
      </Grid>
      <Grid item md={8}>
        <ul>
          <li>
            name <span className="text-primary">(required)</span>
          </li>
          <li>email</li>
          <li>phone</li>
          <li>company</li>
          <li>job</li>
          <li>city</li>
          <li>state</li>
          <li>country</li>
          <li>LinkedIn</li>
          <li>Twitter</li>
        </ul>
      </Grid>
    </>
  );

  let filePrompt = (
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
              <Grid container item>
                <h3>Import contacts</h3>
              </Grid>
              <Grid container item>
                {contactZone}
              </Grid>
              <Grid container item>
                {instructions}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Scrollable>
    </Grid>
  );

  if (!records) {
    return filePrompt;
  }

  if (importProgress !== undefined) {
    let okButton = <></>;

    if (importProgress === records.length) {
      okButton = (
        <Button
          style={{ minWidth: "18rem" }}
          key="ok"
          variant="primary"
          onClick={() => {
            setImportProgress(undefined);
            setRecords(undefined);
          }}
        >
          OK
        </Button>
      );
    }

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
              <Grid container item>
                <Grid item>
                  <h3>Import progress</h3>
                </Grid>
              </Grid>

              <Grid container item>
                <Grid item>
                  <p>
                    {importProgress} of {records.length}
                  </p>
                </Grid>
              </Grid>

              <Grid container item>
                <Grid item>{okButton}</Grid>
              </Grid>
            </CardContent>
          </Card>
        </Scrollable>
      </Grid>
    );
  }

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
            <Grid container item>
              <Grid item>
                <h3>Import preview</h3>
              </Grid>
            </Grid>

            <Grid container item>
              <ContactPreview record={randomRecord} />
            </Grid>

            <Grid container item>
              <Grid item>
                <Button
                  style={{ minWidth: "18rem" }}
                  key="random"
                  onClick={chooseRandomRecord}
                >
                  Preview another random record
                </Button>
              </Grid>
            </Grid>
            <Grid container item>
              <Grid item>
                <Button
                  style={{ minWidth: "18rem" }}
                  key="cancel"
                  variant="contained"
                  onClick={() => setRecords(undefined)}
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>

            <Grid container item>
              <Grid item>
                <Button
                  style={{ minWidth: "18rem" }}
                  key="import"
                  color="primary"
                  variant="contained"
                  onClick={() => {
                    setImportProgress(0);
                  }}
                >
                  Import {records.length} records
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Scrollable>
    </Grid>
  );
}

function ContactPreview(props) {
  const auth = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  let personDocument = recordToPerson(
    firebase,
    props.record,
    auth.oauthClaims.email
  );

  return (
    <pre style={{ width: "100%" }}>
      {JSON.stringify(personDocument, null, 2)}
    </pre>
  );
}
