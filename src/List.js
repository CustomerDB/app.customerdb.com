import React from 'react';

import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { AutoSizer, List as VirtList } from 'react-virtualized';

import Options from './Options.js';

import 'react-virtualized/styles.css';

/**
 * List wraps a firebase collection in a scrollable list.
 * 
 * title => Title of list
 * currentID => int (or undefined for nothing selected)
 * itemLoad(index) => (name, description)
 * itemCount => int
 * onAdd()
 * onClick()
 * onRename(index, newValue)
 * onDelete(index)
 */
export default function List(props) {
    const cardRenderer = ({ key, index, style }) => {
        let d = props.itemLoad(index);

        let name = <p className="listCardTitle" onClick={() => {props.onClick(d.ID)}}>{d.name}</p>;
        let listCardClass = "listCard";
        let invertedColors = false;

        if (props.currentID === d.ID) {
          listCardClass = "listCardActive";
          invertedColors = true;
        }

        return <Row key={key} style={style}>
          <Col>
            <Container className={listCardClass}>
              <Row className="h-100">
                {d.icon !== undefined ? <Col className="align-self-center" md={2}>
                  {d.icon}
                </Col> : <></>}
                <Col className="align-self-center" md={8}>
                  {name}
                </Col>
                <Col md={d.icon !== undefined ? 2 : 4} className="align-self-center">
                  <Options options={props.options} item={d} inverted={invertedColors}/>
                </Col>
              </Row>
            </Container>
          </Col>
        </Row>;
      };

    return <>
        <Row style={{ paddingBottom: "2rem" }}>
        <Col md={10} className="my-auto">
            <h3>{props.name}</h3>
        </Col>
        <Col md={2}>
            <Button className="addButton" onClick={props.onAdd}>+</Button>
        </Col>
        </Row>
        {props.optionsRow}
        <Row className="flex-grow-1">
        <Col>
            <AutoSizer>
            {({ height, width }) => (
                <VirtList
                height={height}
                rowCount={props.itemCount}
                rowHeight={window.getEmPixels() * 6}
                rowRenderer={cardRenderer}
                width={width}
                />
            )}
            </AutoSizer>
        </Col>
        </Row>
    </>;
}
