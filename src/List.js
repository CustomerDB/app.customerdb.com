import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';

import { AutoSizer, List as VirtList } from 'react-virtualized';
import { ThreeDotsVertical } from 'react-bootstrap-icons';

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
    // Modals
    const [editID, setEditID] = useState(undefined);
    const [editValue, setEditValue] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);

    const [deleteID, setDeleteID] = useState(undefined);
    const [deleteTitle, setDeleteTitle] = useState("")
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const editSubmit = () => {
        props.onEdit(editID, editValue);
        setEditID(undefined);
        setEditValue("");
        setShowEditModal(false);
    }

    const cardRenderer = ({ key, index, style }) => {
        let d = props.itemLoad(index);
    
        let title = <p className="listCardTitle" onClick={() => {props.onClick(d.ID)}}>{d.title}</p>;
        let listCardClass = "listCard";
        let threedots = <ThreeDotsVertical />;
    
        if (props.currentID === d.ID) {
          listCardClass = "listCardActive";
          threedots = <ThreeDotsVertical color="white" />;
        }
    
        return <Row key={key} style={style}>
          <Col>
            <Container className={listCardClass}>
              <Row>
                <Col className="listTitleContainer align-self-center" md={8}>
                  {title}
                </Col>
                <Col md={4}>
                  <Dropdown style={{ width: "2.5rem", marginLeft: "auto" }}>
                    <Dropdown.Toggle variant="link" className="threedots">
                      {threedots}
                    </Dropdown.Toggle>
    
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => {
                        setEditID(d.ID);
                        setEditValue(d.title);
                        setShowEditModal(true);
                      }}>Rename</Dropdown.Item>
                      <Dropdown.Item onClick={() => {
                        setDeleteID(d.ID);
                        setDeleteTitle(d.title);
                        setShowDeleteModal(true);
                      }}>Delete</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
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
            <h3 style={{ margin: 0 }}>{props.title}</h3>
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

        <Modal show={showEditModal} onHide={() => { setShowEditModal(false) }} centered>
        <Modal.Header closeButton>
            <Modal.Title>Rename {props.itemType}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <Form.Control type="text" defaultValue={editValue} onChange={(e) => {
            setEditValue(e.target.value);
            }} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                editSubmit();
            }
            }} />
        </Modal.Body>
        <Modal.Footer>
            <Button variant="primary" onClick={editSubmit}>
            Rename
            </Button>
        </Modal.Footer>
        </Modal>

        <Modal show={showDeleteModal} onHide={() => { setShowDeleteModal(false) }} centered>
        <Modal.Header closeButton>
            <Modal.Title>Delete {props.itemType}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            Are you sure you want to delete {deleteTitle}?
            </Modal.Body>
        <Modal.Footer>
            <Button variant="danger" onClick={() => {
                props.onDelete(deleteID);
                setDeleteID(undefined);
                setDeleteTitle("");
                setShowDeleteModal(false);
            }}>
            Delete
            </Button>
        </Modal.Footer>
        </Modal>
    </>;
}