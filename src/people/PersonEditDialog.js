import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import Avatar from "react-avatar";
import ImageDialog from "./ImageDialog.js";

export default function PersonEditDialog({ personRef, open, setOpen }) {
  const [person, setPerson] = useState();
  const [newPerson, setNewPerson] = useState();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const predefinedFields = [
    "name",
    "job",
    "company",
    "email",
    "phone",
    "city",
    "state",
    "country",
  ];
  const excludeFields = [
    "ID",
    "labels",
    "imageURL",
    "creationTimestamp",
    "deletionTimestamp",
    "createdBy",
    "customFields",
  ];
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!personRef) {
      return;
    }

    return personRef.onSnapshot((doc) => {
      let person = doc.data();

      let extraFields = Object.keys(person);

      // Filter ID field.
      extraFields = extraFields.filter(
        (field) =>
          !excludeFields.includes(field) && !predefinedFields.includes(field)
      );

      setFields(predefinedFields.concat(extraFields));

      setPerson(person);
      setNewPerson(person);
    });
  }, [personRef, excludeFields, predefinedFields]);

  const onCancel = () => {
    setPerson(person);
    setOpen(false);
  };

  const onSave = () => {
    console.log("newPerson", newPerson);
    personRef.update(newPerson);
    setOpen(false);
  };

  const title = (field) => {
    return field.charAt(0).toUpperCase() + field.substr(1).toLowerCase();
  };

  if (!newPerson || !fields) {
    return <></>;
  }

  return (
    <>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle id="form-dialog-title">Add new customer</DialogTitle>
        <DialogContent>
          <Grid container item xs={12}>
            <Grid container item xs={8}>
              {fields.map((field) => {
                console.log(field);
                return (
                  <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label={title(field)}
                    fullWidth
                    value={newPerson[field]}
                    onChange={(e) => {
                      let copy = Object.assign({}, newPerson);
                      copy[field] = e.target.value;
                      setNewPerson(copy);
                    }}
                  />
                );
              })}
            </Grid>
            <Grid
              container
              Item
              xs={4}
              alignItems="flex-start"
              alignContent="flex-start"
            >
              <Grid
                container
                justify="center"
                alignItems="flex-start"
                alignContent="flex-start"
                style={{ position: "relative" }}
              >
                <Avatar
                  size={120}
                  name={newPerson.name}
                  src={newPerson.imageURL}
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
              </Grid>
              <ImageDialog
                open={imageDialogOpen}
                setOpen={setImageDialogOpen}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} color="primary">
            Cancel
          </Button>
          <Button variant="contained" onClick={onSave} color="secondary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
