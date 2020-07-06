import ContentEditable from 'react-contenteditable';
import React from 'react';
import ReactQuill from 'react-quill';
import Delta from 'quill-delta';
import 'react-quill/dist/quill.snow.css';
import { withRouter } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import colorPair from './color.js';


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
class Document extends React.Component {
  constructor(props) {
    super(props);

    this.documentID = props.match.params.id;

    this.documentRef = props.documentsRef.doc(this.documentID);
    this.deltasRef = this.documentRef.collection('deltas');
    this.highlightsRef = this.documentRef.collection('highlights');

    this.handleDeltaSnapshot = this.handleDeltaSnapshot.bind(this);
    this.updateTitle = this.updateTitle.bind(this);
    this.uploadDeltas = this.uploadDeltas.bind(this);
    this.onEdit = this.onEdit.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onTagControlChange = this.onTagControlChange.bind(this);
    this.onTagsChange = this.onTagsChange.bind(this);

    this.titleRef = React.createRef();

    this.reactQuillRef = undefined;

    // This is a range object with fields 'index' and 'length'
    this.currentSelection = undefined;

    this.tags = {};

    this.latestSnapshot = {
      timestamp: new window.firebase.firestore.Timestamp(0, 0),
      delta: emptyDelta()
    };

    // Buffer of local editor changes, to be uploaded to the
    // database and distributed to peer clients on periodic sync.
    this.localDelta = new Delta([]);

    this.state = {
      title: "",
      content: "",
      highlights: {},
      delta: this.latestSnapshot.delta,
      tagIDsInSelection: new Set(),

      loadedTags: false,
      loadedHighlights: false,
      loadedDeltas: false
    }
  }

  // Set up database subscriptions and handle document/collection snapshots
  // when they occur.
  componentDidMount() {
    // Subscribe to document title changes
    this.documentRef.onSnapshot((doc) => {
      let data = doc.data();
      this.setState({
        title: data.title
      });
    });

    // Subscribe to highlight changes
    this.highlightsRef.onSnapshot((snapshot) => {
      let highlights = {};

      snapshot.forEach(highlightDoc => {
        let data = highlightDoc.data();
        data['ID'] = highlightDoc.id;
        highlights[data.ID] = data;
      });

      let tagIDs = this.computeTagIDsInSelection(
        highlights,
        this.currentSelection);

      this.setState({
        highlights: highlights,
        tagIDsInSelection: tagIDs,
        loadedHighlights: true
      });
    });

    // Get the full set of deltas once
    this.deltasRef.orderBy("timestamp", "asc").get().then(snapshot => {

      console.log("processing full list of deltas to construct initial snapshot");
      // Process the priming read; download all existing deltas and condense
      // them into an initial local document snapshot
      // (`this.latestSnapshot.delta`)
      this.handleDeltaSnapshot(snapshot);

      // Start periodically uploading cached local edits to firestore.
      setInterval(this.uploadDeltas, 1000);

      console.log("subscribing to deltas after", this.latestSnapshot.timestamp);

      // Now subscribe to all changes that occur after the set
      // of initial deltas we just processed, composing any new deltas
      // with `this.latestSnapshot.delta` and updating
      // `this.latestSnapshot.timestamp`.
      this.deltasRef
        .orderBy("timestamp", "asc")
        .where("timestamp", ">", this.latestSnapshot.timestamp)
        .onSnapshot(this.handleDeltaSnapshot);
    });

  }

  // highlights: a map of highlight ID to highlight
  // selection: a range object with fields 'index' and 'length'
  computeTagIDsInSelection(highlights, selection) {
    let result = new Set();

    if (selection === undefined) {
      return result;
    }

    let selectBegin = selection.index;
    let selectEnd = selectBegin + selection.length;

    console.debug(`selectBegin ${selectBegin} selectEnd ${selectEnd}`);

    Object.values(highlights).forEach(h => {
      let hBegin = h.selection.index
      let hEnd = hBegin + h.selection.length;
      if ((selectBegin >= hBegin && selectBegin <= hEnd) || (selectEnd >= hBegin && selectEnd <= hEnd)) {
        result.add(h.tagID);
      }
    });

    return result;
  }

  handleDeltaSnapshot(snapshot) {
    // for debug
    let allDeltas = [];
    let newDeltas = [];

    snapshot.forEach((delta) => {
      let data = delta.data();

      if (data.timestamp === null) {
        console.debug("skipping delta with no timestamp");
        return;
      }

      allDeltas.push(data);

      let haveSeenBefore = data.timestamp.valueOf() <= this.latestSnapshot.timestamp.valueOf();
      if (haveSeenBefore) {
        console.debug('Dropping delta with timestamp ', data.timestamp);
        return;
      }

      newDeltas.push(new Delta(data.ops));

      this.latestSnapshot.timestamp = data.timestamp;
    });

    console.debug("All deltas\n", allDeltas);
    console.log("New deltas\n", newDeltas);

    if (newDeltas.length === 0) {
      console.log("No new deltas to apply");
      return;
    }

    // Seed the newDeltas list with our starting point, which is the
    // latest content snapshot.
    newDeltas = [this.latestSnapshot.delta].concat(newDeltas);

    // result is the result of composing all known
    // deltas in the database; having started from our cached
    // last known sync point.
    let result = reduceDeltas(newDeltas);

    // Cache this value now.
    this.latestSnapshot.delta = result;

    if (this.state.loadedDeltas) {
      result = result.compose(this.localDelta);
    }

    this.setState({
      delta: result,
      loadedDeltas: true
    });
    console.log('applying result', result);
  }

  // updateTitle is invoked when the editable document title bar loses focus.
  updateTitle(e) {
    let newTitle = e.target.innerText;
    this.documentRef.set({ title: newTitle }, { merge: true });
  }

  // onEdit builds a batch of local edits in `this.deltasToUpload`
  // which are sent to the server and reset to [] periodically
  // in `this.uploadDeltas()`.
  onEdit(content, delta, source, editor) {
    if (source !== 'user') {
      console.debug('onEdit: skipping non-user change');
      return;
    }
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
      userID: this.props.user.uid,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      ops: ops
    };

    console.log('uploading delta', deltaDoc);
    this.deltasRef.doc().set(deltaDoc);
  }

  // onSelect is invoked when the content selection changes, including
  // whenever the cursor changes position.
  onSelect(range, source, editor) {
    if (source !== 'user') {
      return;
    }
    if (range === null) {
      this.currentSelection = undefined;
    }
    else {
      this.currentSelection = range;
    }

    let tagIDs = this.computeTagIDsInSelection(
      this.state.highlights,
      this.currentSelection);

    this.setState({ tagIDsInSelection: tagIDs, delta: editor.getContents() });
  }

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  onTagControlChange(tag, checked) {
    console.log("onTagControlChange", tag, checked);

    if (this.currentSelection === undefined) {
      return;
    }

    if (checked) {
      console.log("Creating highlight with tag ", tag);
      let editor = this.reactQuillRef.getEditor();
      let selectionText = editor.getText(this.currentSelection.index, this.currentSelection.length);

      this.highlightsRef.doc().set({
        tagID: tag.ID,
        selection: {
          index: this.currentSelection.index,
          length: this.currentSelection.length
        },
        text: selectionText
      });
    }

    if (!checked) {
      console.log("Deleting highlight in current selection with tag ", tag);
      // TODO
    }
  }

  // onTagsChange is invoked when the set of tags is loaded, or changes.
  onTagsChange(tags) {
    // TODO: This should be done better :'(
    this.tags = tags;
    this.setState({
      loadedTags: true
    });
  }

  render() {
    let content = this.state.delta;

    // Append highlight styles
    if (this.state.loadedDeltas && this.state.loadedHighlights && this.state.loadedTags) {
      Object.values(this.state.highlights).forEach(h => {
        let color = this.tags[h.tagID].color;
        let hDelta = new Delta([{retain: h.selection.index}, {retain: h.selection.length, attributes: {'background': color}}]);
        content = content.compose(hDelta);
      });
    }

    return <div>
      <Container>
        <Row>
          <Col md={12}>
            <ContentEditable
              innerRef={this.titleRef}
              tagName='h1'
              html={this.state.title}
              disabled={false}
              onBlur={this.updateTitle}
              />
          </Col>
        </Row>
        <Row>
          <Col ms={10} md={10}>
          <ReactQuill
            ref={(el) => { this.reactQuillRef = el }}
            value={content}
            onChange={this.onEdit}
            onChangeSelection={this.onSelect} />
        </Col>
        <Col ms={2} md={2}>
          <Tags
            tagsRef={this.documentRef.collection('tags')}
            tagIDsInSelection={this.state.tagIDsInSelection}
            onChange={this.onTagControlChange}
            onTagsChange={this.onTagsChange} />
        </Col>
        </Row>
      </Container>
    </div>;
  }
}

class Tags extends React.Component {
  constructor(props) {
    super(props);

    this.tagsRef = props.tagsRef;

    this.onChange = props.onChange;

    this.createTag = this.createTag.bind(this);

    this.state = {
      tags: []
    }
  }

  componentDidMount() {
    this.props.tagsRef.onSnapshot(snapshot => {
      let tags = {};
      snapshot.forEach(tagDoc => {
        let data = tagDoc.data();
        data['ID'] = tagDoc.id;
        tags[data['ID']] = data;
      });
      this.setState({ tags: Object.values(tags) });
      this.props.onTagsChange(tags);
    });
  }

  createTag(e) {
    let name = e.target.innerText;

    let color = colorPair().background;

    this.tagsRef.doc().set({
      name: name,
      color: color
    });

    e.target.innerHTML = "";
  }

  onTagControlChange(e, tag) {
    this.onChange(tag, e.target.checked);
  }

  render() {
    let tagControls = this.state.tags.map(t => {
      let checked = this.props.tagIDsInSelection.has(t.ID);

      let label = <span style={{ color: t.color }} >{t.name}</span>;

      return <Form.Check
        key={t.ID}
        type="checkbox"
        checked={checked}
        label={label}
        onChange={(e) => {this.onTagControlChange(e, t)}}/>
    });

    return <div>
      Tags
      {tagControls}

      <ContentEditable
        innerRef={this.titleRef}
        tagName='div'
        html=""
        disabled={false}
        onBlur={this.createTag} />

    </div>;
  }
}

export default withRouter(Document);
