import React from 'react';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';

export default class Documents extends React.Component {
  constructor(props) {
    super(props);

    this.documentsRef = props.documentsRef;

    this.state = {
      documents: {}
    }
  }

  componentDidMount() {
    this.documentsRef.onSnapshot((snapshot) => {
      // TODO
    });
  }

  createNewDocument() {
  }

  deleteDocument() {
  }

  render() {
    return <div>
      <Button onClick={this.props.logoutCallback} variant="link">Logout</Button>
      <div className="outerContainer">
        <div className="uploadContainer">
          <div className="uploadTitle">
            <div className="uploadTitleContainer">
              <h3>Documents</h3>
            </div>
            <Button onClick={this.createNewDocument}>Create New</Button>
          </div>
          <br/>
          <DocumentTable documents={this.state.documents} deleteDocument={this.deleteDocument}/>
        </div>
      </div>
    </div>;
  }
}

function DocumentTable(props) {
    let documentRows = [];
    Object.entries(props.documents).forEach((d) => {
      let documentID = d[0];
      let document = d[1];

      documentRows.push(<tr key={documentID}>
        <td>{document.name}</td>
        <td>{document.state}</td>
        <td style={{textAlign: 'right'}}>
          <Button variant="link" onClick={() => {props.deletedocument(documentID)}}>Delete</Button>{ }
          <Button onClick={() => {window.location.href=`/document/${documentID}`}}>Open</Button>
        </td>
      </tr>);
    });
    return <Table>
    <thead>
      <tr>
        <th>Name</th>
        <th style={{width: "15rem"}}>{ }</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {documentRows}
    </tbody>
    </Table>;
}
