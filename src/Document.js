import ContentEditable from 'react-contenteditable';
import React from 'react';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import Delta from 'quill-delta';
import 'react-quill/dist/quill.bubble.css';
import { nanoid } from 'nanoid';

import { Navigate } from 'react-router-dom';

import { AutoSizer } from 'react-virtualized';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Tab from 'react-bootstrap/Tab';
import Nav from 'react-bootstrap/Nav';

import { Loading } from './Utils.js';

import Tags, {addTagStyles, removeTagStyles} from './editor/Tags.js';

import HighlightBlot from './editor/HighlightBlot.js';
Quill.register('formats/highlight', HighlightBlot);


// Returns a new delta object representing an empty document.
function emptyDelta() {
  return new Delta([{ insert: "" }]);
}

// Returns the result of folding the supplied array of deltas
// using the item at index 0 as the initial value.
//
// Returns an empty delta if the supplied array is empty.
function reduceDeltas(deltas) {
  if (deltas.length === 0) {
    return emptyDelta();
  }

  let result = deltas[0];

  deltas.slice(1).forEach(d => {
    result = result.compose(d);
  });

  return result;
}

function checkReturn(e) {
  if (e.key === 'Enter') {
    e.target.blur();
  }
}

// Document is a React component that allows multiple users to edit
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
export default class Document extends React.Component {
  constructor(props) {
    super(props);

    this.documentRef = props.documentsRef.doc(this.props.documentID);
    this.deltasRef = this.documentRef.collection('deltas');
    this.highlightsRef = this.documentRef.collection('highlights');

    this.tagsRef = undefined;

    this.getHighlightFromEditor = this.getHighlightFromEditor.bind(this);
    this.handleInitialDeltas = this.handleInitialDeltas.bind(this);
    this.handleDeltaSnapshot = this.handleDeltaSnapshot.bind(this);
    this.updateName = this.updateName.bind(this);
    this.uploadDeltas = this.uploadDeltas.bind(this);
    this.syncHighlights = this.syncHighlights.bind(this);

    this.onEdit = this.onEdit.bind(this);
    this.onSelect = this.onSelect.bind(this);

    this.onTagControlChange = this.onTagControlChange.bind(this);
    this.onTagGroupChange = this.onTagGroupChange.bind(this);
    this.subscribeToTags = this.subscribeToTags.bind(this);
    this.unsubscribeFromTags = this.unsubscribeFromTags.bind(this);

    this.nameRef = React.createRef();

    this.reactQuillRef = undefined;

    // This is a range object with fields 'index' and 'length'
    this.currentSelection = undefined;

    this.latestDeltaTimestamp = new window.firebase.firestore.Timestamp(0, 0);

    this.editorID = nanoid();

    // Buffer of local editor changes, to be uploaded to the
    // database and distributed to peer clients on periodic sync.
    this.localDelta = new Delta([]);

    this.subscriptions = [];

    this.unsubscribeTagsCallback = () => { };

    this.intervals = [];

    this.highlights = {};

    this.state = {
      name: "",
      exists: true,
      deletionTimestamp: "",
      deletedBy: '',
      initialDelta: emptyDelta(),
      tagIDsInSelection: new Set(),

      tagGroups: [],
      tagGroupID: "",
      tags: {},

      loadedDocument: false,
      loadedTagGroups: false,
      loadedTags: false,
      loadedDeltas: false
    }
  }

  // Set up database subscriptions and handle document/collection snapshots
  // when they occur.
  componentDidMount() {
    // Subscribe to document name changes
    this.subscriptions.push(this.documentRef.onSnapshot(doc => {
      if (!doc.exists) {
        this.setState({ exists: false });
        return;
      }

      let data = doc.data();
      console.debug("data", data);

      let tagsRef = undefined;
      if (data.tagGroupID && data.tagGroupID !== "") {
        tagsRef = this.props.tagGroupsRef.doc(data.tagGroupID).collection("tags");
      }

      this.setState({
        loadedDocument: true,
        name: data.name,
        deletionTimestamp: data.deletionTimestamp,
        deletedBy: data.deletedBy,
        tagGroupID: data.tagGroupID,
        tagsRef: tagsRef
      });

      this.subscribeToTags(tagsRef);
    }));

    // Subscribe to tag groups changes
    this.subscriptions.push(this.props.tagGroupsRef.onSnapshot(snapshot => {
      console.debug("received tag groups snapshot");

      let tagGroups = [];

      snapshot.forEach(doc => {
        let data = doc.data();
        data.ID = doc.id;
        tagGroups.push(data);
      });

      this.setState({
        tagGroups: tagGroups,
        loadedTagGroups: true
      });
    }));

    // Subscribe to highlight changes
    this.subscriptions.push(this.highlightsRef.onSnapshot(snapshot => {
      let highlights = {};

      snapshot.forEach(highlightDoc => {
        let data = highlightDoc.data();
        data['ID'] = highlightDoc.id;
        highlights[data.ID] = data;
      });

      this.highlights = highlights;
    }));

    // Get the full set of deltas once
    this.deltasRef.orderBy("timestamp", "asc").get().then(snapshot => {
      console.debug("processing full list of deltas to construct initial snapshot");
      // Process the priming read; download all existing deltas and condense
      // them into an initial local document snapshot
      // (`this.state.initialDelta`)
      this.handleInitialDeltas(snapshot);

      // Start periodically uploading cached local document edits to firestore.
      this.intervals.push(setInterval(this.uploadDeltas, 1000));

      // Start periodically uploading cached highlight edits to firestore.
      this.intervals.push(setInterval(this.syncHighlights, 1000));

      console.debug("subscribing to deltas after", this.latestDeltatimestamp);

      // Now subscribe to all changes that occur after the set
      // of initial deltas we just processed and updating
      // `this.latestDeltatimestamp`.
      this.subscriptions.push(this.deltasRef
        .orderBy("timestamp", "asc")
        .where("timestamp", ">", this.latestDeltaTimestamp)
        .onSnapshot(this.handleDeltaSnapshot));
    });
  }

  subscribeToTags(tagsRef) {
    console.debug("subscribing to tag changes", tagsRef);
    this.unsubscribeFromTags();

    if (!tagsRef) {
      this.setState({
        tags: {},
        "loadedTags": true
      });
      return;
    }

    this.tagsRef = tagsRef;

    this.unsubscribeTagsCallback = this.tagsRef
      .where("deletionTimestamp", "==", "")
      .onSnapshot(
        snapshot => {
          console.debug("received tags snapshot");
          let tags = {};
          snapshot.forEach(tagDoc => {
            let data = tagDoc.data();
            data.ID = tagDoc.id;
            tags[data.ID] = data;
          });

          console.debug("new tags", tags);

          addTagStyles(tags);

          this.setState({
            tags: tags,
            loadedTags: true
          });
        }
      );
  }

  unsubscribeFromTags() {
    console.debug("unsubscribing from tag changes");
    this.unsubscribeTagsCallback();
    this.unsubscribeTagsCallback = () => { };
  }

  componentWillUnmount() {
    this.subscriptions.forEach((unsubscribe) => { unsubscribe() });
    this.intervals.forEach(clearInterval);

    this.subscriptions = [];
    this.intervals = [];

    removeTagStyles();
  }

  // selection: a range object with fields 'index' and 'length'
  computeHighlightsInSelection(selection) {
    let result = [];

    if (selection === undefined) {
      return result;
    }

    let length = selection.length > 0 ? selection.length : 1;
    let editor = this.reactQuillRef.getEditor();
    let selectionDelta = editor.getContents(selection.index, length);
    let selectedHighlightIDs = [];

    selectionDelta.ops.forEach(op => {
      if (op.attributes && op.attributes.highlight) {
        selectedHighlightIDs.push(op.attributes.highlight.highlightID);
      }
    });

    return selectedHighlightIDs.flatMap(id => {
      let highlight = this.getHighlightFromEditor(id);
      if (highlight) return [highlight];
      return [];
    });
  }

  getHighlightIDsFromEditor() {
    let result = new Set();
    let domNodes = document.getElementsByClassName("inline-highlight")
    for (let i = 0; i < domNodes.length; i++) {
      let highlightID = domNodes[i].dataset.highlightID;
      if (highlightID) {
        result.add(highlightID);
      }
    }
    return result;
  }

  // Returns the index and length of the highlight with the supplied ID
  // in the current editor.
  getHighlightFromEditor(highlightID) {
    let domNode = document.getElementById(`highlight-${highlightID}`);

    if (!domNode) return undefined;

    let tagID = domNode.dataset.tagID;
    let blot = Quill.find(domNode, false);

    if (!blot) return undefined;

    let editor = this.reactQuillRef.getEditor();
    let index = editor.getIndex(blot);
    let length = blot.length();
    let text = editor.getText(index, length);

    return {
      tagID: tagID,
      selection: {
        index: index,
        length: length
      },
      text: text
    };
  }

  // selection: a range object with fields 'index' and 'length'
  computeTagIDsInSelection(selection) {
    let intersectingHighlights = this.computeHighlightsInSelection(selection);

    let result = new Set();
    intersectingHighlights.forEach(h => result.add(h.tagID));
    return result;
  }

  handleInitialDeltas(snapshot) {
    console.log("handling initial set of deltas");
    let deltas = [];

    snapshot.forEach((delta) => {
      let data = delta.data();

      if (data.timestamp === null) {
        console.debug("skipping delta with no timestamp");
        return;
      }

      deltas.push(new Delta(data.ops));
      this.latestDeltaTimestamp = data.timestamp;
    });

    // result is the result of composing all known
    // deltas in the database
    let result = reduceDeltas(deltas);

    this.setState({
      initialDelta: result,
      loadedDeltas: true
    });
  }

  handleDeltaSnapshot(snapshot) {
    let newDeltas = [];

    snapshot.forEach((delta) => {
      let data = delta.data();

      // Skip deltas from this client
      if (data.editorID === this.editorID) {
        console.debug("skipping delta from this client");
        return;
      }

      // Skip deltas with no timestamp
      if (data.timestamp === null) {
        console.debug("skipping delta with no timestamp");
        return;
      }

      // Skip deltas older than the latest timestamp we have applied already
      let haveSeenBefore = data.timestamp.valueOf() <= this.latestDeltaTimestamp.valueOf();
      if (haveSeenBefore) {
        console.debug('Dropping delta with timestamp ', data.timestamp);
        return;
      }

      newDeltas.push(new Delta(data.ops));
      this.latestDeltaTimestamp = data.timestamp;
    });

    if (newDeltas.length === 0) {
      console.debug("no new deltas to apply");
      return;
    }

    console.debug('applying deltas to editor', newDeltas);

    let editor = this.reactQuillRef.getEditor();
    newDeltas.forEach(delta => {
      console.log("editor.updateContents", delta);
      editor.updateContents(delta);
    });
  }

  // updateName is invoked when the editable document name bar loses focus.
  updateName(e) {
    let newName = e.target.innerText;
    this.documentRef.set({ name: newName }, { merge: true });
  }

  // onEdit builds a batch of local edits in `this.deltasToUpload`
  // which are sent to the server and reset to [] periodically
  // in `this.uploadDeltas()`.
  onEdit(content, delta, source, editor) {
    if (source !== 'user') {
      console.debug('onEdit: skipping non-user change', delta, source);
      return;
    }
    console.debug('onEdit: caching user change', delta);
    this.localDelta = this.localDelta.compose(delta);
  }

  // uploadDeltas is invoked periodically by a timer.
  //
  // This function sends the contents of `this.localDelta` to the database
  // and resets the local cache.
  uploadDeltas() {
    let opsIndex = this.localDelta.ops.length;
    if (opsIndex === 0) {
      return;
    }

    let ops = this.localDelta.ops.slice(0, opsIndex);
    this.localDelta = new Delta(this.localDelta.ops.slice(opsIndex));

    let deltaDoc = {
      editorID: this.editorID,
      userEmail: this.props.user.email,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      ops: ops
    };

    console.debug('uploading delta', deltaDoc);
    this.deltasRef.doc().set(deltaDoc);
  }

  // This function sends any local updates to highlight content relative
  // to the local editor to the database.
  syncHighlights() {
    if (!this.reactQuillRef || !this.reactQuillRef.getEditor()) {
      return;
    }

    // Update or delete highlights based on local edits.
    Object.values(this.highlights).forEach(h => {
      let current = this.getHighlightFromEditor(h.ID);

      if (current === undefined) {
        // highlight is not present; delete it in the database.
        console.debug("syncHighlights: deleting highlight", h);
        this.highlightsRef.doc(h.ID).delete();
        return;
      }

      if (current.tagID !== h.tagID ||
        current.selection.index !== h.selection.index ||
        current.selection.length !== h.selection.length ||
        current.text !== h.text) {

        console.debug("syncHighlights: updating highlight", h, current);

        // upload diff
        this.highlightsRef.doc(h.ID).set({
          tagID: current.tagID,
          selection: {
            index: current.selection.index,
            length: current.selection.length,
          },
          text: current.text,
          lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    });

    let editorHighlightIDs = this.getHighlightIDsFromEditor();
    editorHighlightIDs.forEach(highlightID => {
      let current = this.getHighlightFromEditor(highlightID);
      if (current !== undefined && !this.highlights.hasOwnProperty(highlightID)) {
        let newHighlight = {
          ID: highlightID,
          organizationID: this.props.orgID,
          documentID: this.props.documentID,
          tagID: current.tagID,
          selection: {
            index: current.selection.index,
            length: current.selection.length,
          },
          text: current.text,
          createdBy: this.props.user.email,
          creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        };

        console.debug("syncHighlights: creating highlight", newHighlight);
        this.highlightsRef.doc(highlightID).set(newHighlight);
      }
    });
  }

  // onSelect is invoked when the content selection changes, including
  // whenever the cursor changes position.
  onSelect(range, source, editor) {
    if (source !== 'user') {
      return;
    }
    if (range === null) {
      // this.currentSelection = undefined;
      return;
    }
    else {
      this.currentSelection = range;
    }

    let tagIDs = this.computeTagIDsInSelection(this.currentSelection);

    this.setState({ tagIDsInSelection: tagIDs });
  }

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  onTagControlChange(tag, checked) {
    console.debug("onTagControlChange", tag, checked);

    if (this.currentSelection === undefined) {
      return;
    }

    let editor = this.reactQuillRef.getEditor();

    if (checked) {
      console.debug("formatting highlight with tag ", tag);
      let selectionText = editor.getText(
        this.currentSelection.index,
        this.currentSelection.length);

      let highlightID = nanoid();

      let delta = editor.formatText(
        this.currentSelection.index,
        this.currentSelection.length,
        'highlight',
        { highlightID: highlightID, tagID: tag.ID },
        'user'
      );
    }

    if (!checked) {
      let intersectingHighlights = this.computeHighlightsInSelection(this.currentSelection);

      intersectingHighlights.forEach(h => {
        if (h.tagID === tag.ID) {
          console.debug("deleting highlight format in current selection with tag ", tag);

          let delta = editor.removeFormat(
            h.selection.index,
            h.selection.length,
            'highlight',
            false,  // unsets the target format
            'user'
          );

          this.localDelta = this.localDelta.compose(delta);
        }
      });
    }

    let tagIDs = this.computeTagIDsInSelection(this.currentSelection);
    this.setState({ tagIDsInSelection: tagIDs });
  }

  onTagGroupChange(e) {
    let newTagGroupID = e.target.value;

    if (newTagGroupID !== this.state.tagGroupID) {

      // Confirm this change if the the set of highlights is not empty.
      let numHighlights = Object.keys(this.highlights).length;
      if (numHighlights > 0) {

        console.debug("TODO: use a modal for this instead");
        let proceed = window.confirm(`This operation will delete ${numHighlights} highlights.\nAre you sure you want to change tag groups?`);

        if (!proceed) {
          console.debug("user declined to proceeed changing tag group");
          e.target.value = this.state.tagGroupID;
          return;
        }

        // Remove the highlight format from the existing text.
        let editor = this.reactQuillRef.getEditor();

        let delta = editor.removeFormat(
          0,
          editor.getLength(),
          'highlight',
          false,  // unsets the target format
          'user'
        );

        this.localDelta = this.localDelta.compose(delta);
      }

      this.documentRef.set({
        tagGroupID: newTagGroupID
      }, { merge: true });
    }
  }

  render() {
    if (!this.state.exists) {
      return <Navigate to="/404" />
    }

    if (!this.state.loadedDocument ||
      !this.state.loadedDeltas ||
      !this.state.loadedTags ||
      !this.state.loadedTagGroups) {
      return <Loading />
    }

    if (this.state.deletionTimestamp !== "") {
      let date = this.state.deletionTimestamp.toDate();

      return <Container>
        <Row>
          <Col>
            <h3>{this.state.name}</h3>
          </Col>
        </Row>
        <Row>
          <Col>
            <p>This document was deleted at {date.toString()} by {this.state.deletedBy}</p>
          </Col>
        </Row>
      </Container>;
    }

    let contentTabPane = <Tab.Pane eventKey="content">
      <Container className="p-3">
        <Row>
          <Col>
            <ReactQuill
              ref={(el) => { this.reactQuillRef = el }}
              defaultValue={this.state.initialDelta}
              theme="bubble"
              placeholder="Start typing here and select to mark highlights"
              onChange={this.onEdit}
              onChangeSelection={this.onSelect} />
          </Col>
          <Col ms={2} md={2}>
            <Tags
              tags={Object.values(this.state.tags)}
              tagIDsInSelection={this.state.tagIDsInSelection}
              onChange={this.onTagControlChange} />
          </Col>
        </Row>
      </Container>
    </Tab.Pane>;

    let detailsTabPane = <Tab.Pane eventKey="details">
      <Container className="p-3">
        <Row className="mb-3">
          <Col>
            <Form>
              <Form.Group>
                <Form.Label>Tag group</Form.Label>
                <Form.Control as="select"
                  onChange={this.onTagGroupChange}
                  defaultValue={this.state.tagGroupID}>
                  <option value="" style={{ fontStyle: "italic" }}>Choose a tag group...</option>
                  {
                    this.state.tagGroups.map(group => {
                      return <option value={group.ID}>{group.name}</option>
                    })
                  }
                </Form.Control>
              </Form.Group>
            </Form>

          </Col>
        </Row>
      </Container>
    </Tab.Pane>;

    return <>
      <Row style={{ paddingBottom: "2rem" }}>
        <Col>
          <ContentEditable
            innerRef={this.nameRef}
            tagName='h3'
            html={this.state.name}
            disabled={false}
            onBlur={this.updateName}
            onKeyDown={checkReturn}
          />
        </Col>
      </Row>

      <Tab.Container id="documentTabs" defaultActiveKey="content">
        <Row>
          <Col>
            <Nav variant="pills">
              <Nav.Item>
                <Nav.Link eventKey="content">Content</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="details">Details</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>

        <Row className="flex-grow-1">
          <AutoSizer>
            {({ height, width }) => (
              <Col>
                <Tab.Content style={{ height: height, width: width, overflowY: "auto" }}>
                  {contentTabPane}
                  {detailsTabPane}
                </Tab.Content>
              </Col>
            )}
          </AutoSizer>
        </Row>
      </Tab.Container>
    </>;
  }
}
