import ContentEditable from 'react-contenteditable';
import React from 'react';
import ReactQuill from 'react-quill';
import Delta from 'quill-delta';
import 'react-quill/dist/quill.snow.css';
import { withRouter } from 'react-router-dom';
import { uuid } from 'uuidv4';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import colorPair from './color.js';


function emptyDelta() {
  return new Delta([{ insert: "" }]);
}

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

// How does this work with multiple editors:
//
// - This client subscribes to all partial document updates.
//     - When the set of patches changes, we apply all.
//     - When a new patch is received, we apply it to the document locally.
//
// - This client periodically uploads a merged diff of
//   local document edits to the database, which are
//   pushed to peer clients.
//
class Document extends React.Component {
  constructor(props) {
    super(props);

    this.documentID = props.match.params.id;

    this.documentRef = props.documentsRef.doc(this.documentID);
    this.deltasRef = this.documentRef.collection('deltas');
    this.highlightsRef = this.documentRef.collection('highlights');

    this.updateTitle = this.updateTitle.bind(this);
    this.uploadDeltas = this.uploadDeltas.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onTagControlChange = this.onTagControlChange.bind(this);
    this.onTagsChange = this.onTagsChange.bind(this);

    this.titleRef = React.createRef();

    this.deltaSet = new Set();
    this.reactQuillRef = undefined;

    // This is a range object with fields 'index' and 'length'
    this.currentSelection = undefined;

    this.lastEditedContent = undefined;
    this.lastSentContent = undefined;

    this.tags = {};

    // a delta with no insert is "not a document"
    let initialDelta = emptyDelta();

    this.state = {
      title: "",
      content: "",
      highlights: {},
      delta: initialDelta,
      tagIDsInSelection: new Set()
    }
  }

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
        tagIDsInSelection: tagIDs
      });
    });

    // Subscribe to document edit changes
    this.deltasRef.orderBy("timestamp", "asc").onSnapshot((snapshot) => {
      let deltas = [];

      snapshot.forEach((delta) => {
        let data = delta.data();
        if (this.deltaSet.has(data.id)) {
          console.log(`Dropping delta with id ${data.id}`)
          return;
        }

        console.log(`Applying delta ${JSON.stringify(data)}`)
        let ops = data['ops'];

        deltas.push(new Delta(ops));

        this.deltaSet.add(data.id);
      });

      if (deltas.length === 0) {
        return;
      }

      let editor = this.reactQuillRef.getEditor();
      let content = editor.getContents();

      let remoteSnapshot = reduceDeltas(deltas);
      let result = content.compose(remoteSnapshot);
      this.setState({
        delta: result
      });
      console.log(`currentContent: ${JSON.stringify(content)} delta: ${JSON.stringify(remoteSnapshot)} applyingResult: ${JSON.stringify(result)}`);
      this.lastSyncedContent = result;
    });

    setInterval(this.uploadDeltas, 1000);
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

    console.log(`selectBegin ${selectBegin} selectEnd ${selectEnd}`);

    Object.values(highlights).forEach(h => {
      let hBegin = h.selection.index
      let hEnd = hBegin + h.selection.length;
      console.log(`${h.name} hBegin ${hBegin} hEnd ${hEnd}`);
      if ((selectBegin >= hBegin && selectBegin <= hEnd) || (selectEnd >= hBegin && selectEnd <= hEnd)) {
        result.add(h.tagID);
      }
    });

    return result;
  }

  updateTitle(e) {
    let newTitle = e.target.innerText;
    this.documentRef.set({ title: newTitle }, { merge: true });
  }

  uploadDeltas() {
    if (this.reactQuillRef  === undefined) {
      return;
    }
    if (this.lastSyncedContent === undefined) {
      return;
    }

    let editor = this.reactQuillRef.getEditor();
    let content = editor.getContents();
    let diff;
    if (this.lastSyncedContent === undefined) {
      diff = content;
    } else {
      diff = this.lastSyncedContent.diff(content);
    }

    if (diff.ops.length === 0) {
      return;
    }

    this.lastSyncedContent = content;

    // Create document in deltas collection
    let id = uuid();
    this.deltaSet.add(id);
    let delta = {
      userID: this.props.user.uid,
      ops: diff.ops,
      id: id,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    console.log(`Write delta: ${JSON.stringify(delta)}`);
    this.deltasRef.doc().set(delta);
  }

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
    }
  }

  onTagsChange(tags) {
    // TODO: This should be done better :'(
    this.tags = tags;
  }

  render() {
    let highlightDeltas = Object.values(this.state.highlights).flatMap((h) => {
      if (this.tags.hasOwnProperty(h.tagID)) {
        let color = this.tags[h.tagID].color;
        return [new Delta([{retain: h.selection.index}, {retain: h.selection.length, attributes: {'background': color}}])];
      }
      return [];
    });
    let highlightResult = reduceDeltas(highlightDeltas);
    let result = this.state.delta.compose(highlightResult);

    console.log('result', result, 'highlightResult', highlightResult);

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
            value={result}
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
