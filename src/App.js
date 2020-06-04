import React from 'react';
import './App.css';

var storageRef = window.firebase.storage().ref();

class App extends React.Component {
  constructor(props) {
    super(props);
    this.handleFileUploadSubmit = this.handleFileUploadSubmit.bind(this);
    this.handleFileUploadChange = this.handleFileUploadChange.bind(this);
    this.state = {
      'selectedFile': undefined
    };
  }

  handleFileUploadSubmit(e) {
    const uploadTask = storageRef.child(`csvs/${this.state.selectedFile.name}`).put(this.state.selectedFile); //create a child directory called images, and place the file inside this directory
    uploadTask.on('state_changed', (snapshot) => {
    // Observe state change events such as progress, pause, and resume
    }, (error) => {
      // Handle unsuccessful uploads
      console.log(error);
    }, () => {
       // Do something once upload is complete
       console.log('success');
    });
  }

  handleFileUploadChange(e) {
    this.setState({'selectedFile': e.target.files[0]});
  }

  render() {
    return (
      <div>
        <div id="filesubmit">
          <input type="file" class="file-select" accept=".csv" onChange={this.handleFileUploadChange}/>
          <button class="file-submit" onClick={this.handleFileUploadSubmit}>Upload</button>
        </div>
      </div>
    );
  }
}

export default App;
