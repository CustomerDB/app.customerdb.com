import React, { useContext, useCallback, useEffect, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import Scrollable from "../shell/Scrollable.js";

import { useDropzone } from "react-dropzone";

import papa from "papaparse";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

export default function BulkImport(props) {
  const auth = useContext(UserAuthContext);

  const [records, setRecords] = useState();
  const [randomRecord, setRandomRecord] = useState();
  const [importProgress, setImportProgress] = useState();

  const chooseRandomRecord = () => {
    if (!records || records.length === 0) {
      setRandomRecord(undefined);
      return;
    }

    let index = Math.floor(Math.random() * records.length);
    setRandomRecord(records[index]);
  };

  useEffect(chooseRandomRecord, [records]);

  const createPerson = (record) => {
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

        createdBy: auth.oauthClaims.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      };
    }

    if (!filtered.name) {
      console.debug("skipping record (name missing)", record);
      setImportProgress(importProgress + 1);
      return;
    }

    console.log("importing record", record, filtered);
    return props.peopleRef.add(filtered).then(() => {
      setImportProgress(importProgress + 1);
    });
  };

  useEffect(() => {
    if (importProgress !== undefined && importProgress < records.length) {
      createPerson(records[importProgress]);
    }
  }, [importProgress]);

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
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  let contactZone = (
    <Col
      {...getRootProps()}
      className="p-4"
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
    </Col>
  );

  let instructions = (
    <>
      <Col md={4}>
        <p>Standard columns</p>
      </Col>
      <Col md={8}>
        <ul>
          <li>
            name <span class="text-primary">(required)</span>
          </li>
          <li>email</li>
          <li>phone</li>
          <li>company</li>
          <li>job</li>
          <li>city</li>
          <li>state</li>
          <li>country</li>
        </ul>
      </Col>
    </>
  );

  let filePrompt = (
    <Container fluid>
      <Row className="mt-2 mb-4">
        <h3>Import contacts</h3>
      </Row>
      <Row>{contactZone}</Row>
      <Row className="pt-4">{instructions}</Row>
    </Container>
  );

  if (!records) {
    return filePrompt;
  }

  if (importProgress !== undefined) {
    let importProgressPercent = importProgress / records.length;
    let okButton = <></>;

    if (importProgress === records.length) {
      importProgressPercent = 100;

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
      <Scrollable>
        <Container fluid>
          <Row className="mt-4 mb-4">
            <h3>Import progress</h3>
          </Row>
          <Row>
            <p>
              {importProgress} of {records.length}
            </p>
          </Row>

          <Row className="pt-3">{okButton}</Row>
        </Container>
      </Scrollable>
    );
  }

  return (
    <Scrollable>
      <Container fluid>
        <Row className="mt-4 mb-4">
          <h3>Import preview</h3>
        </Row>
        <Row>
          <ContactPreview record={randomRecord} />
        </Row>
        <Row className="pt-3">
          <Button
            style={{ minWidth: "18rem" }}
            key="random"
            variant="link"
            onClick={chooseRandomRecord}
          >
            Preview another random record
          </Button>
        </Row>
        <Row className="pt-3">
          <Button
            style={{ minWidth: "18rem" }}
            key="cancel"
            variant="secondary"
            onClick={() => setRecords(undefined)}
          >
            Cancel
          </Button>
        </Row>
        <Row className="pt-3">
          <Button
            style={{ minWidth: "18rem" }}
            key="import"
            variant="success"
            onClick={() => {
              setImportProgress(0);
            }}
          >
            Import {records.length} records
          </Button>
        </Row>
      </Container>
    </Scrollable>
  );
}

function ContactPreview(props) {
  let filtered = {};
  if (props.record) {
    filtered = {
      name: props.record.name || null,
      email: props.record.email || null,
      phone: props.record.phone || null,
      company: props.record.company || null,
      job: props.record.job || null,
      city: props.record.city || null,
      state: props.record.state || null,
      country: props.record.country || null,
    };
  }

  return (
    <pre style={{ width: "100%" }}>{JSON.stringify(filtered, null, 2)}</pre>
  );
}
