import React from 'react';
import ReactQuill from 'react-quill';
import Delta from 'quill-delta';
import 'react-quill/dist/quill.snow.css';
import { withRouter } from 'react-router-dom';
import { uuid } from 'uuidv4';

function reduceDeltas(deltas) {
  if (deltas.length === 0) {
    return new Delta([]);
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
    this.uploadDeltas = this.uploadDeltas.bind(this);

    this.deltaSet = new Set();
    this.reactQuillRef = undefined;

    this.lastEditedContent = undefined;
    this.lastSentContent = undefined;

    this.state = {
      title: "",
      content: "",
      delta: new Delta([])
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

  uploadDeltas() {
    if (this.reactQuillRef  === undefined) {
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

  render() {
    return <div>
      <h1>{this.state.title}</h1>
      <ReactQuill
        ref={(el) => { this.reactQuillRef = el }}
        value={this.state.delta}
        // onChange={this.handleEdit}
        />
    </div>;
  }
}

export default withRouter(Document);
