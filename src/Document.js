import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { withRouter } from 'react-router-dom';

function reduceDeltas(deltas) {
  if (deltas.length === 0) {
    return { ops: [] };
  }

  let result = deltas[0].slice();

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

    this.handleEdit = this.handleEdit.bind(this);

    this.deltaBuffer = [];

    this.state = {
      title: "",
      content: ""
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
        deltas.push(delta.data());
      });

      this.setState({
        delta: reduceDeltas(deltas.concat(this.deltaBuffer))
      });
    });
  }

  handleEdit(content, delta, source, editor) {
    this.deltaBuffer.push(delta);
  }

  uploadDeltas() {
    let delta = reduceDeltas(this.deltaBuffer);
    delta.timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
    delta.userID = this.props.user.uid;

    // Create document in deltas collection
    this.deltasRef.doc().set(delta).then(() => {
      console.log("uploaded incremental delta", delta);
      this.deltaBuffer = [];
    });
  }

  render() {
    return <div>
      <h1>{this.state.title}</h1>
      <ReactQuill
        className="textEditor"
        value={this.state.delta}
        onChange={this.handleEdit} />
    </div>;
  }
}

export default withRouter(Document);
