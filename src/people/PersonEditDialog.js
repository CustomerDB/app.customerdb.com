import React, { useContext, useEffect, useState } from "react";

// import Button from "react-bootstrap/Button";
// import Col from "react-bootstrap/Col";
// import DeleteIcon from "@material-ui/icons/Delete";
// import FirebaseContext from "../util/FirebaseContext.js";
// import Form from "react-bootstrap/Form";
// import Modal from "../shell_obsolete/Modal.js";
// import Row from "react-bootstrap/Row";
// import UserAuthContext from "../auth/UserAuthContext.js";
// import event from "../analytics/event.js";
// import { useParams } from "react-router-dom";
// import { v4 as uuidv4 } from "uuid";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";

export default function PersonEditDialog({ open, setOpen }) {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
      <DialogTitle id="form-dialog-title">Add new customer</DialogTitle>
      <DialogContent>
        <Grid container item xs={12}>
          <Grid container item xs={8}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Full name"
              fullWidth
            />
            <TextField
              autoFocus
              margin="dense"
              id="email"
              label="Email"
              type="email"
              fullWidth
            />
            <TextField
              autoFocus
              margin="dense"
              id="job"
              label="Job"
              fullWidth
            />

            <TextField
              autoFocus
              margin="dense"
              id="company"
              label="Company"
              fullWidth
            />
          </Grid>
          <Grid container Item xs={4}></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} color="primary">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(false)}
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// function OldPersonEditDialog(props) {
//   const { oauthClaims } = useContext(UserAuthContext);
//   const firebase = useContext(FirebaseContext);
//   const [person, setPerson] = useState();
//   const [name, setName] = useState();
//   const [email, setEmail] = useState();
//   const [company, setCompany] = useState();
//   const [job, setJob] = useState();
//   const [phone, setPhone] = useState();
//   const [country, setCountry] = useState();
//   const [state, setState] = useState();
//   const [city, setCity] = useState();

//   const { orgID } = useParams();

//   const [customFields, setCustomFields] = useState({});
//   const [labels, setLabels] = useState({});

//   useEffect(() => {
//     if (!props.personRef) {
//       return;
//     }

//     props.personRef.get().then((doc) => {
//       let person = doc.data();
//       person.ID = doc.id;

//       setName(person.name || "");
//       setEmail(person.email || "");
//       setCompany(person.company || "");
//       setJob(person.job || "");
//       setPhone(person.phone || "");
//       setCountry(person.country || "");
//       setState(person.state || "");
//       setCity(person.city || "");

//       setCustomFields(person.customFields || {});
//       setLabels(person.labels || {});

//       setPerson(person);
//     });
//   }, [props.show, props.personRef]);

//   if (!person) {
//     return <></>;
//   }

//   const addCustomField = () => {
//     let ID = uuidv4();
//     let fields = {};
//     Object.assign(fields, customFields);
//     fields[ID] = { ID: ID, kind: "", value: "" };
//     setCustomFields(fields);
//   };

//   const addLabel = () => {
//     let ID = uuidv4();
//     let l = {};
//     Object.assign(l, labels);
//     l[ID] = { ID: ID, kind: "" };
//     setLabels(l);
//   };

//   let fields = [
//     {
//       label: "Full name",
//       placeholder: "Name",
//       type: "text",
//       value: name,
//       setter: setName,
//     },
//     {
//       label: "Email address",
//       placeholder: "Email",
//       type: "email",
//       value: email,
//       setter: setEmail,
//     },
//     {
//       label: "Company name",
//       placeholder: "Company",
//       type: "text",
//       value: company,
//       setter: setCompany,
//     },
//     {
//       label: "Job title",
//       placeholder: "Job",
//       type: "text",
//       value: job,
//       setter: setJob,
//     },
//     {
//       label: "Phone number",
//       placeholder: "Phone",
//       type: "text",
//       value: phone,
//       setter: setPhone,
//     },
//     {
//       label: "Country",
//       placeholder: "Country",
//       type: "text",
//       value: country,
//       setter: setCountry,
//     },
//     {
//       label: "State",
//       placeholder: "State",
//       type: "text",
//       value: state,
//       setter: setState,
//     },
//     {
//       label: "City",
//       placeholder: "City",
//       type: "text",
//       value: city,
//       setter: setCity,
//     },
//   ];

//   return (
//     <Modal
//       show={props.show}
//       onHide={props.onHide}
//       name="Edit person"
//       footer={[
//         <Button
//           key={person.ID}
//           onClick={() => {
//             event(firebase, "edit_person", {
//               orgID: orgID,
//               userID: oauthClaims.user_id,
//             });

//             person.name = name;
//             person.email = email;
//             person.company = company;
//             person.job = job;
//             person.phone = phone;
//             person.country = country;
//             person.state = state;
//             person.city = city;

//             person.customFields = customFields;
//             person.labels = labels;

//             props.personRef.set(person).then(() => {
//               setPerson();
//               setName();
//               setEmail();
//               setCompany();
//               setPhone();
//               setCountry();
//               setState();
//               setCity();
//             });
//           }}
//         >
//           Save
//         </Button>,
//       ]}
//     >
//       {fields.map((field) => (
//         <Row className="mb-3" key={field.label}>
//           <Col>
//             <Form.Label>{field.label}</Form.Label>
//             <Form.Control
//               type={field.type}
//               placeholder={field.placeholder}
//               value={field.value}
//               onChange={(e) => {
//                 field.setter(e.target.value);
//               }}
//             />
//           </Col>
//         </Row>
//       ))}

//       <Row>
//         <Col>
//           <Form.Label>Other details</Form.Label>
//         </Col>
//       </Row>
//       {Object.values(customFields).map((field) => {
//         return (
//           <Row className="mb-2" key={field.ID}>
//             <Col>
//               <Row>
//                 <Col md={4}>
//                   <Form.Control
//                     type="text"
//                     placeholder="Kind"
//                     defaultValue={field.kind}
//                     onChange={(e) => {
//                       let fields = {};
//                       Object.assign(fields, customFields);
//                       fields[field.ID].kind = e.target.value;
//                       setCustomFields(fields);
//                     }}
//                   />
//                 </Col>
//                 <Col md={7}>
//                   <Form.Control
//                     type="text"
//                     placeholder="Value"
//                     defaultValue={field.value}
//                     onChange={(e) => {
//                       let fields = {};
//                       Object.assign(fields, customFields);
//                       fields[field.ID].value = e.target.value;
//                       setCustomFields(fields);
//                     }}
//                   />
//                 </Col>
//                 <Col md={1} style={{ padding: 0 }}>
//                   <Button variant="link">
//                     <DeleteIcon
//                       color="grey"
//                       onClick={() => {
//                         let fields = {};
//                         Object.assign(fields, customFields);
//                         delete fields[field.ID];
//                         setCustomFields(fields);
//                       }}
//                     />
//                   </Button>
//                 </Col>
//               </Row>
//             </Col>
//           </Row>
//         );
//       })}
//       <Row className="mb-3">
//         <Col>
//           <Button
//             className="addButton"
//             style={{ width: "1.5rem", height: "1.5rem", fontSize: "0.75rem" }}
//             onClick={addCustomField}
//           >
//             +
//           </Button>
//         </Col>
//       </Row>
//       <Row>
//         <Col>
//           <Form.Label>Labels</Form.Label>
//         </Col>
//       </Row>
//       {Object.values(labels).map((label) => {
//         return (
//           <Row className="mb-2" key={label.ID}>
//             <Col>
//               <Row>
//                 <Col md={8}>
//                   <Form.Control
//                     type="text"
//                     placeholder="Name"
//                     defaultValue={label.name}
//                     onChange={(e) => {
//                       let l = {};
//                       Object.assign(l, labels);
//                       l[label.ID].name = e.target.value;
//                       setLabels(l);
//                     }}
//                   />
//                 </Col>
//                 <Col md={1} style={{ padding: 0 }}>
//                   <Button variant="link">
//                     <DeleteIcon
//                       color="grey"
//                       onClick={() => {
//                         let l = {};
//                         Object.assign(l, labels);
//                         delete l[label.ID];
//                         setLabels(l);
//                       }}
//                     />
//                   </Button>
//                 </Col>
//               </Row>
//             </Col>
//           </Row>
//         );
//       })}
//       <Row>
//         <Col>
//           <Button
//             className="addButton"
//             style={{ width: "1.5rem", height: "1.5rem", fontSize: "0.75rem" }}
//             onClick={addLabel}
//           >
//             +
//           </Button>
//         </Col>
//       </Row>
//     </Modal>
//   );
// }
