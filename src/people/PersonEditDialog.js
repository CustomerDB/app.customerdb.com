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
import CancelIcon from "@material-ui/icons/Cancel";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import { v4 as uuidv4 } from "uuid";
import NewFieldDialog from "./NewFieldDialog";

export default function PersonEditDialog({ person, personRef, open, setOpen }) {
  const [newPerson, setNewPerson] = useState();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageURL, setImageURL] = useState();
  const [newFieldDialogOpen, setNewFieldDialogOpen] = useState();

  const fields = [
    "name",
    "job",
    "company",
    "email",
    "phone",
    "city",
    "state",
    "country",
  ];

  useEffect(() => {
    if (!person || newPerson) {
      return;
    }

    setNewPerson(person);
    setImageURL(person.imageURL);
  }, [person, newPerson, fields]);

  const onCancel = () => {
    setNewPerson();
    setImageURL();
    setOpen(false);
  };

  const onSave = () => {
    if (imageURL) {
      newPerson.imageURL = imageURL;
    }

    personRef.update(newPerson).then(() => {
      setNewPerson();
      setImageURL();
      setOpen(false);
    });
  };

  const title = (field) => {
    return field.charAt(0).toUpperCase() + field.substr(1).toLowerCase();
  };

  if (!newPerson || !fields) {
    return <></>;
  }

  console.log("open: ", open);

  return (
    <>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle id="form-dialog-title">Add new customer</DialogTitle>
        <DialogContent>
          <Grid container item xs={12}>
            <Grid container item xs={8}>
              {fields.map((field) => {
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

              {newPerson.customFields &&
                Object.values(newPerson.customFields).map((field) => (
                  <TextField
                    fullWidth
                    label={field.kind}
                    value={field.value}
                    onChange={(e) => {
                      let copy = Object.assign({}, newPerson);
                      copy.customFields[field.ID].value = e.target.value;
                      setNewPerson(copy);
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => {
                              let copy = Object.assign({}, newPerson);
                              delete copy.customFields[field.ID];
                              setNewPerson(copy);
                            }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                ))}
              <Button
                onClick={() => {
                  setNewFieldDialogOpen(true);
                }}
              >
                + Add custom field
              </Button>
              <NewFieldDialog
                open={newFieldDialogOpen}
                setOpen={setNewFieldDialogOpen}
                onAdd={(kind) => {
                  let copy = Object.assign({}, newPerson);
                  let id = uuidv4();
                  if (!(copy.customFields in copy)) {
                    copy.customFields = {};
                  }

                  copy.customFields[id] = {
                    ID: id,
                    kind: kind,
                  };
                  setNewPerson(copy);
                  setNewFieldDialogOpen(false);
                }}
              />
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
                  src={imageURL}
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
                setImageURL={setImageURL}
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
