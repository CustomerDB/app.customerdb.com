import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { AutoSizer, List as VirtList } from 'react-virtualized';
import { ThreeDotsVertical } from 'react-bootstrap-icons';

import Options from './Options.js';

import 'react-virtualized/styles.css';

/**
 * List wraps a firebase collection in a scrollable list.
 * 
 * title => Title of list
 * itemType => Name of items for modals
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
    
        let title = <p className="listCardTitle" onClick={() => {props.onClick(d.ID)}}>{d.title}</p>;
        let listCardClass = "listCard";
        let invertedColors = false;
    
        if (props.currentID === d.ID) {
          listCardClass = "listCardActive";
          invertedColors = true;
        }
    
        return <Row key={key} style={style}>
          <Col>
            <Container className={listCardClass}>
              <Row>
                <Col className="listTitleContainer align-self-center" md={8}>
                  {title}
                </Col>
                <Col md={4}>
                  <Options options={props.options} item={d} inverted={invertedColors}/>
                </Col>
              </Row>
              <Row>
                <Col>
                  <p onClick={() => {props.onClick(d.ID)}}>{d.description}</p>
                </Col>
              </Row>
            </Container>
          </Col>
        </Row>;
      };

    return <>
        <Row style={{ paddingBottom: "2rem" }}>
        <Col md={10} className="my-auto">
            <h3>{props.title}</h3>
        </Col>
        <Col md={2}>
            <Button className="addButton" onClick={props.onAdd}>+</Button>
        </Col>
        </Row>
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