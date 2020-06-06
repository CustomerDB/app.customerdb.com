import React from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';

export default function DatasetTable(props) {
    let datasetRows = [];
    Object.entries(props.datasets).forEach((v) => {  
      let disabled = !(v[1].state === "");
      let datasetID = v[0];
      let dataset = v[1];

      datasetRows.push(<tr key={datasetID}>
        <td>{dataset.name}</td>
        <td>{dataset.state}</td>
        <td style={{textAlign: 'right'}}>
          <Button disabled={disabled} variant="link" onClick={() => {props.deleteDataset(datasetID)}}>Delete</Button>{ }
          <Button disabled={disabled} onClick={() => {window.location.href=`/dataset/${datasetID}`}}>Open</Button>
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
      {datasetRows}
    </tbody>
    </Table>;
}