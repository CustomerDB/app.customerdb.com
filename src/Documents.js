import React from 'react';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Delta from 'quill-delta';

import LeftNav from './LeftNav.js';


function initialDelta() {
  return new Delta([{ insert: "\n" }]);
}

export default class Documents extends React.Component {
  constructor(props) {
    super(props);

    this.documentsRef = props.documentsRef;

    this.createNewDocument = this.createNewDocument.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);

    this.state = {
      documents: []
    }
  }

  componentDidMount() {
    this.documentsRef.where("owners", "array-contains", this.props.user.uid).onSnapshot((snapshot) => {
      let docs = [];

      snapshot.forEach((doc) => {
        let data = doc.data();
        data['ID'] = doc.id;
        docs.push(data);
      });

      this.setState({
        documents: docs
      })
    });
  }

  createNewDocument() {
    console.log("documentsRef", this.documentsRef);
    this.documentsRef.add({
      title: "Untitled Document",
      owners: [this.props.user.uid]
    }).then(newDocRef => {
      let delta = initialDelta();
      newDocRef.collection('deltas')
        .doc()
        .set({
          userID: this.props.user.uid,
          ops: delta.ops,
          id: "",
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    });
  }

  deleteDocument(id) {
    this.documentsRef.doc(id).delete();
  }

  render() {
    return <div className="navContainer">
        <LeftNav logoutCallback={this.props.logoutCallback}/>
        <div className="navBody">
          <div className="outerContainer">
            <div className="uploadContainer">
              <div className="uploadTitle">
                <div className="uploadTitleContainer">
                  <h3>Documents</h3>
                </div>
                <Button onClick={this.createNewDocument}>Create</Button>
              </div>
              <br/>
              <DocumentTable documents={this.state.documents} deleteDocument={this.deleteDocument}/>
            </div>
          </div>
        </div>
      </div>;
  }
}

function DocumentTable(props) {

    let documentRows = props.documents.map((d) => {
      let documentID = d['ID'];

      return <tr key={documentID}>
        <td>{d.title}</td>
        <td style={{textAlign: 'right'}}>
          <Button variant="link" onClick={() => {props.deleteDocument(documentID)}}>Delete</Button>{ }
          <Button onClick={() => {window.location.href=`/document/${documentID}`}}>Open</Button>
        </td>
      </tr>;
    });

    return <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {documentRows}
      </tbody>
    </Table>;
}
