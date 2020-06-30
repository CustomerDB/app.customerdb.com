import React from 'react';
import ReactQuill from 'react-quill';
import { withRouter } from 'react-router-dom';

class Document extends React.Component {
  constructor(props) {
    super(props);

    this.documentID = this.props.match.params.id;
  }

  render() {
    return <div />;
  }
}

export default withRouter(Document);
