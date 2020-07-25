import React from "react";

import ReactQuill from "react-quill";
import Delta from "quill-delta";
import Quill from "quill";
import { nanoid } from "nanoid";

import "react-quill/dist/quill.bubble.css";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";

import Tabs from "../shell/Tabs.js";

import Scrollable from "../shell/Scrollable.js";
import Tags, { addTagStyles, removeTagStyles } from "./Tags.js";
import HighlightBlot from "./HighlightBlot.js";

Quill.register("formats/highlight", HighlightBlot);

// ContentsPane is a React component that allows multiple users to edit
// and highlight a text document simultaneously.
//
// It uses the Quill editor (see https://quilljs.com).
//
// The Quill editor uses a handy content format called Delta, which represents
// operations like text insertion, deletion, formatting, etc. in a manner
// similar to `diff(1)`.
//
// This component manages the bidirectional synchronization necessary to
// construct the illusion of simultaneous editing by distributed clients.
//
// On page load, this component loads all of the existing deltas ordered by
// server timestamp, and iteratively applies them to construct an initial
// document snapshot. This component also keeps track of the latest delta
// timestamp seen from the server.
//
// The first synchronization operation is to upload local changes to the
// deltas collection in firestore. For efficiency, edits are cached locally
// and then periodically sent in a batch.
//
// The second synchronization operation involves subscribing to changes to
// the deltas collection in firestore. On each change to the collection snapshot,
// this component ignores deltas written before the last-seen timestamp. New
// deltas are applied to the local document snapshot, followed by any locally
// cached edits that haven't been sent back to firestore yet.
//
// This component also manages tags and text highlights. When this component
// renders, it generates text formatting deltas on the fly to visually
// communicate what text segments are associated with tags with background
// colors.
export default function ContentsPane(props) {
  //   this.deltasRef = this.documentRef.collection("deltas");
  //   this.highlightsRef = this.documentRef.collection("highlights");
  // //   this.editorID = nanoid();

  /////////////////////////////////////////////////////////////////////////////

  // This should go in a useEffect:

  // let tagsRef = undefined;
  // if (data.tagGroupID && data.tagGroupID !== "") {
  //   tagsRef = this.props.tagGroupsRef
  //     .doc(data.tagGroupID)
  //     .collection("tags");
  // }

  // // Load initial snapshot from document.
  // this.latestDeltaTimestamp = data.latestSnapshotTimestamp;

  // // TODO: Should be done in a separate useEffect.
  // // Return functions to clear timers.
  // // this.intervals.push(setInterval(this.uploadDeltas, 1000));
  // // this.intervals.push(setInterval(this.syncHighlights, 1000));

  // // Now subscribe to all changes that occur after the snapshot
  // // timestamp.
  // if (!this.deltaSubscription) {
  //   this.deltaSubscription = this.deltasRef
  //     .orderBy("timestamp", "asc")
  //     .where("timestamp", ">", this.latestDeltaTimestamp)
  //     .onSnapshot(this.handleDeltaSnapshot);
  // }

  // this.subscribeToTags(tagsRef);

  /////////////////////////////////////////////////////////////////////////////

  // TODO(Replace with useState)
  // this.setState({
  //   loadedDocument: true,
  //   document: data,
  //   tagsRef: tagsRef,
  //   initialDelta: new Delta(data.latestSnapshot.ops),
  //   loadedDeltas: true,
  // });

  // // Subscribe to tag groups changes
  // useEffect(() => {
  //   return this.props.tagGroupsRef.onSnapshot((snapshot) => {
  //     console.debug("received tag groups snapshot");

  //     let tagGroups = [];

  //     snapshot.forEach((doc) => {
  //       let data = doc.data();
  //       data.ID = doc.id;
  //       tagGroups.push(data);
  //     });

  //     this.setState({
  //       tagGroups: tagGroups,
  //       loadedTagGroups: true,
  //     });
  //   });
  // }, []);

  // // Subscribe to highlight changes
  // useEffect(() => {
  //   return this.highlightsRef.onSnapshot((snapshot) => {
  //     let highlights = {};

  //     snapshot.forEach((highlightDoc) => {
  //       let data = highlightDoc.data();
  //       data["ID"] = highlightDoc.id;
  //       highlights[data.ID] = data;
  //     });

  //     this.highlights = highlights;
  //   })
  // }, []);

  // // TODO: Move into own useEffect
  // const subscribeToTags = (tagsRef) => {
  //   console.debug("subscribing to tag changes", tagsRef);
  //   this.unsubscribeFromTags();

  //   if (!tagsRef) {
  //     this.setState({
  //       tags: {},
  //       loadedTags: true,
  //     });
  //     return;
  //   }

  //   this.tagsRef = tagsRef;

  //   this.unsubscribeTagsCallback = this.tagsRef
  //     .where("deletionTimestamp", "==", "")
  //     .onSnapshot((snapshot) => {
  //       console.debug("received tags snapshot");
  //       let tags = {};
  //       snapshot.forEach((tagDoc) => {
  //         let data = tagDoc.data();
  //         data.ID = tagDoc.id;
  //         tags[data.ID] = data;
  //       });

  //       console.debug("new tags", tags);

  //       addTagStyles(tags);

  //       this.setState({
  //         tags: tags,
  //         loadedTags: true,
  //       });
  //     });
  // }

  // // Return from new tag useeffect.
  // // Call removeTagStyles()
  // const unsubscribeFromTags = () => {
  //   console.debug("unsubscribing from tag changes");
  //   this.unsubscribeTagsCallback();
  //   this.unsubscribeTagsCallback = () => { };
  // }

  // // selection: a range object with fields 'index' and 'length'
  // const computeHighlightsInSelection = (selection) => {
  //   let result = [];

  //   if (selection === undefined) {
  //     return result;
  //   }

  //   let length = selection.length > 0 ? selection.length : 1;
  //   let editor = this.reactQuillRef.getEditor();
  //   let selectionDelta = editor.getContents(selection.index, length);
  //   let selectedHighlightIDs = [];

  //   selectionDelta.ops.forEach((op) => {
  //     if (op.attributes && op.attributes.highlight) {
  //       selectedHighlightIDs.push(op.attributes.highlight.highlightID);
  //     }
  //   });

  //   return selectedHighlightIDs.flatMap((id) => {
  //     let highlight = this.getHighlightFromEditor(id);
  //     if (highlight) return [highlight];
  //     return [];
  //   });
  // }

  // getHighlightIDsFromEditor = () => {
  //   let result = new Set();
  //   let domNodes = document.getElementsByClassName("inline-highlight");
  //   for (let i = 0; i < domNodes.length; i++) {
  //     let highlightID = domNodes[i].dataset.highlightID;
  //     if (highlightID) {
  //       result.add(highlightID);
  //     }
  //   }
  //   return result;
  // }

  // // Returns the index and length of the highlight with the supplied ID
  // // in the current editor.
  // const getHighlightFromEditor = (highlightID) => {
  //   let domNode = document.getElementById(`highlight-${highlightID}`);

  //   if (!domNode) return undefined;

  //   let tagID = domNode.dataset.tagID;
  //   let blot = Quill.find(domNode, false);

  //   if (!blot) return undefined;

  //   let editor = this.reactQuillRef.getEditor();
  //   let index = editor.getIndex(blot);
  //   let length = blot.length();
  //   let text = editor.getText(index, length);

  //   return {
  //     tagID: tagID,
  //     selection: {
  //       index: index,
  //       length: length,
  //     },
  //     text: text,
  //   };
  // }

  // // selection: a range object with fields 'index' and 'length'
  // const computeTagIDsInSelection = (selection) => {
  //   let intersectingHighlights = this.computeHighlightsInSelection(selection);

  //   let result = new Set();
  //   intersectingHighlights.forEach((h) => result.add(h.tagID));
  //   return result;
  // }

  // const handleDeltaSnapshot = (snapshot) => {
  //   let newDeltas = [];

  //   snapshot.forEach((delta) => {
  //     let data = delta.data();

  //     // Skip deltas with no timestamp
  //     if (data.timestamp === null) {
  //       console.debug("skipping delta with no timestamp");
  //       return;
  //     }

  //     // Skip deltas older than the latest timestamp we have applied already
  //     let haveSeenBefore =
  //       data.timestamp.valueOf() <= this.latestDeltaTimestamp.valueOf();

  //     if (haveSeenBefore) {
  //       console.debug("Dropping delta with timestamp ", data.timestamp);
  //       return;
  //     }

  //     let newDelta = new Delta(data.ops);

  //     // Hang the editorID off of the delta.
  //     newDelta.editorID = data.editorID;

  //     // Skip deltas from this client
  //     if (data.editorID === this.editorID) {
  //       console.debug("skipping delta from this client");
  //       return;
  //     }

  //     newDeltas.push(newDelta);
  //     this.latestDeltaTimestamp = data.timestamp;
  //   });

  //   if (newDeltas.length === 0) {
  //     console.debug("no new deltas to apply");
  //     return;
  //   }

  //   console.debug("applying deltas to editor", newDeltas);

  //   let editor = this.reactQuillRef.getEditor();

  //   // What we have:
  //   // - this.localDelta: the buffered local edits that haven't been uploaded yet
  //   // - editor.getContents(): document delta representing local editor content

  //   let selection = editor.getSelection();
  //   let selectionIndex = selection ? selection.index : 0;

  //   // Compute inverse of local delta.
  //   let editorContents = editor.getContents();
  //   console.log("editorContents", editorContents);

  //   console.log("localDelta (before)", this.localDelta);
  //   let inverseLocalDelta = this.localDelta.invert(editorContents);
  //   console.log("inverseLocalDelta", inverseLocalDelta);

  //   // Undo local edits
  //   console.log("unapplying local delta");
  //   editor.updateContents(inverseLocalDelta);
  //   selectionIndex = inverseLocalDelta.transformPosition(selectionIndex);

  //   newDeltas.forEach((delta) => {
  //     console.log("editor.updateContents", delta);
  //     editor.updateContents(delta);
  //     selectionIndex = delta.transformPosition(selectionIndex);

  //     console.log("transform local delta");
  //     const serverFirst = true;
  //     this.localDelta = delta.transform(this.localDelta, serverFirst);
  //   });

  //   // Reapply local edits
  //   console.log("applying transformed local delta", this.localDelta);
  //   editor.updateContents(this.localDelta);
  //   selectionIndex = this.localDelta.transformPosition(selectionIndex);

  //   if (selection) {
  //     console.log("updating selection index");
  //     editor.setSelection(selectionIndex, selection.length);
  //   }
  // }

  // // onEdit builds a batch of local edits in `this.deltasToUpload`
  // // which are sent to the server and reset to [] periodically
  // // in `this.uploadDeltas()`.
  // const onEdit = (content, delta, source, editor) => {
  //   if (source !== "user") {
  //     console.debug("onEdit: skipping non-user change", delta, source);
  //     return;
  //   }
  //   console.debug("onEdit: caching user change", delta);
  //   this.localDelta = this.localDelta.compose(delta);
  // }

  // // uploadDeltas is invoked periodically by a timer.
  // //
  // // This function sends the contents of `this.localDelta` to the database
  // // and resets the local cache.
  // const syncDeltas = () => {
  //   let opsIndex = this.localDelta.ops.length;
  //   if (opsIndex === 0) {
  //     return;
  //   }

  //   let ops = this.localDelta.ops.slice(0, opsIndex);
  //   this.localDelta = new Delta(this.localDelta.ops.slice(opsIndex));

  //   let deltaDoc = {
  //     editorID: this.editorID,
  //     userEmail: this.props.user.email,
  //     timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
  //     ops: ops,
  //   };

  //   console.debug("uploading delta", deltaDoc);
  //   this.deltasRef.doc().set(deltaDoc);
  // }

  // // This function sends any local updates to highlight content relative
  // // to the local editor to the database.
  // const syncHighlights = () => {
  //   if (!this.reactQuillRef || !this.reactQuillRef.getEditor()) {
  //     return;
  //   }

  //   // Update or delete highlights based on local edits.
  //   Object.values(this.highlights).forEach((h) => {
  //     let current = this.getHighlightFromEditor(h.ID);

  //     if (current === undefined) {
  //       // highlight is not present; delete it in the database.
  //       console.debug("syncHighlights: deleting highlight", h);
  //       this.highlightsRef.doc(h.ID).delete();
  //       return;
  //     }

  //     if (
  //       current.tagID !== h.tagID ||
  //       current.selection.index !== h.selection.index ||
  //       current.selection.length !== h.selection.length ||
  //       current.text !== h.text
  //     ) {
  //       console.debug("syncHighlights: updating highlight", h, current);

  //       // upload diff
  //       this.highlightsRef.doc(h.ID).set(
  //         {
  //           tagID: current.tagID,
  //           selection: {
  //             index: current.selection.index,
  //             length: current.selection.length,
  //           },
  //           text: current.text,
  //           lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
  //         },
  //         { merge: true }
  //       );
  //     }
  //   });

  //   let editorHighlightIDs = this.getHighlightIDsFromEditor();
  //   editorHighlightIDs.forEach((highlightID) => {
  //     let current = this.getHighlightFromEditor(highlightID);
  //     if (
  //       current !== undefined &&
  //       !this.highlights.hasOwnProperty(highlightID)
  //     ) {
  //       let newHighlight = {
  //         ID: highlightID,
  //         organizationID: this.props.orgID,
  //         documentID: this.props.documentID,
  //         tagID: current.tagID,
  //         selection: {
  //           index: current.selection.index,
  //           length: current.selection.length,
  //         },
  //         text: current.text,
  //         createdBy: this.props.user.email,
  //         creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
  //         lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
  //       };

  //       console.debug("syncHighlights: creating highlight", newHighlight);
  //       this.highlightsRef.doc(highlightID).set(newHighlight);
  //     }
  //   });
  // }

  // // onSelect is invoked when the content selection changes, including
  // // whenever the cursor changes position.
  // const onSelect = (range, source, editor) => {
  //   if (source !== "user") {
  //     return;
  //   }
  //   if (range === null) {
  //     return;
  //   } else {
  //     this.currentSelection = range;
  //   }

  //   let tagIDs = this.computeTagIDsInSelection(this.currentSelection);

  //   this.setState({ tagIDsInSelection: tagIDs });
  // }

  // // onTagControlChange is invoked when the user checks or unchecks one of the
  // // tag input elements.
  // const onTagControlChange = (tag, checked) => {
  //   console.debug("onTagControlChange", tag, checked);

  //   if (this.currentSelection === undefined) {
  //     return;
  //   }

  //   let editor = this.reactQuillRef.getEditor();

  //   if (checked) {
  //     console.debug("formatting highlight with tag ", tag);
  //     let selectionText = editor.getText(
  //       this.currentSelection.index,
  //       this.currentSelection.length
  //     );

  //     let highlightID = nanoid();

  //     let delta = editor.formatText(
  //       this.currentSelection.index,
  //       this.currentSelection.length,
  //       "highlight",
  //       { highlightID: highlightID, tagID: tag.ID },
  //       "user"
  //     );
  //   }

  //   if (!checked) {
  //     let intersectingHighlights = this.computeHighlightsInSelection(
  //       this.currentSelection
  //     );

  //     intersectingHighlights.forEach((h) => {
  //       if (h.tagID === tag.ID) {
  //         console.debug(
  //           "deleting highlight format in current selection with tag ",
  //           tag
  //         );

  //         let delta = editor.removeFormat(
  //           h.selection.index,
  //           h.selection.length,
  //           "highlight",
  //           false, // unsets the target format
  //           "user"
  //         );

  //         this.localDelta = this.localDelta.compose(delta);
  //       }
  //     });
  //   }

  //   let tagIDs = this.computeTagIDsInSelection(this.currentSelection);
  //   this.setState({ tagIDsInSelection: tagIDs });
  // }

  return <Tabs.Content></Tabs.Content>;

  // return <Tab.Pane key="content" eventKey="content" className="h-100">
  //   <Container className="p-3 h-100">
  //     <Row className="h-100 w-100" noGutters={true}>
  //       <Col>
  //         <Scrollable>
  //           <ReactQuill
  //             ref={(el) => {
  //               this.reactQuillRef = el;
  //             }}
  //             defaultValue={this.state.initialDelta}
  //             theme="bubble"
  //             placeholder="Start typing here and select to mark highlights"
  //             onChange={this.onEdit}
  //             onChangeSelection={this.onSelect}
  //           />
  //         </Scrollable>
  //       </Col>
  //       <Col md={2}>
  //         <Tags
  //           tags={Object.values(this.state.tags)}
  //           tagIDsInSelection={this.state.tagIDsInSelection}
  //           onChange={this.onTagControlChange}
  //         />
  //       </Col>
  //     </Row>
  //   </Container>
  // </Tab.Pane>;
}
