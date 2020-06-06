import React from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';

export default function DatasetTable(props) {
    let datasetRows = [];
    Object.entries(props.datasets).forEach((v) => {  
      let disabled = !(v[1].state === "");
      datasetRows.push(<tr key={v[0]}>
        <td>{v[1].name}</td>
        <td>{v[1].state}</td>
        <td>
          <Button disabled={disabled} variant="link" onClick={() => {props.deleteDataset(v[0])}}>Delete</Button>{ }
          <Button disabled={disabled}>Open</Button>
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