import React from 'react';
import ReactQuill from 'react-quill';
import Delta from 'quill-delta';
import 'react-quill/dist/quill.snow.css';
import { withRouter } from 'react-router-dom';

function reduceDeltas(deltas) {
  if (deltas.length === 0) {
    return new Delta([]);
  }

  let result = new Delta([]);

  deltas.forEach(d => {
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

    this.handleEdit = this.handleEdit.bind(this);

    this.deltaBuffer = [];

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
        let ops = delta.data()['ops'];
        console.log('ops: ' + ops)
        deltas.push(new Delta(ops));
      });

      console.log(`Applying deltas: ${deltas}`)

      this.setState({
        delta: reduceDeltas(deltas.concat(this.deltaBuffer))
      });
    });

    setInterval(this.uploadDeltas, 500);
  }

  handleEdit(content, delta, source, editor) {
    this.deltaBuffer.push(delta);
  }

  uploadDeltas() {
    if (this.deltaBuffer.length === 0) {
      return;
    }

    let delta = reduceDeltas(this.deltaBuffer);

    // Create document in deltas collection
    this.deltasRef.doc().set({
      userID: this.props.user.uid,
      ops: delta.ops,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log("uploaded incremental delta", delta);
      this.deltaBuffer = [];
    });
  }

  render() {
    return <div>
      <h1>{this.state.title}</h1>
      <ReactQuill
        value={this.state.delta}
        onChange={this.handleEdit} />
    </div>;
  }
}

export default withRouter(Document);
