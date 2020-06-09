import React from 'react';


export default class DatasetTabPane extends React.Component {
  constructor(props) {
    super(props);
    this.tag = props.tag;
    this.dataset = props.datasetRef;
    this.state = {
      isDataLoaded: false,
      children: undefined
    }
  }

  componentDidMount() {
    this.dataset.collection('highlights').where("Tag", "==", this.tag).onSnapshot(
      (
        function(querySnapshot) {
          var children = [];
          querySnapshot.forEach(
            function(doc) {
              let data = doc.data();
              console.log(data);
              children.push(
                <tr><td>{data.Created}</td><td>{data.Tag}</td><td>{data.Text}</td></tr>
              );
            }
          );

          this.setState({ children: children });
        }
      ).bind(this)
    );
  }

  render() {
    return <div>
      <table>
        {this.state.children}
      </table>
    </div>;
  }
}
