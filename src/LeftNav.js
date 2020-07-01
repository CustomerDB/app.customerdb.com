import React from 'react';
import Button from 'react-bootstrap/Button';
import { DoorOpen, PieChart, People, Journals } from 'react-bootstrap-icons';

export default function LeftNav(props) {
    return <div className="navLeft">
    <div>
      <Button onClick={() => {window.location.href="/"}} variant="link"><People/></Button>
    </div>
    <div>
      <Button onClick={() => {window.location.href="/documents"}} variant="link"><Journals/></Button>
    </div>
    <div>
      <Button onClick={() => {window.location.href="/"}} variant="link"><PieChart/></Button>
    </div>
    <div style={{flexGrow: "1", display: "flex", flexDirection: "column"}}>
      <Button onClick={props.logoutCallback} variant="link" style={{marginTop: "auto"}}><DoorOpen/></Button>
    </div>
  </div>;
}