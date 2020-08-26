import BootstrapModal from "react-bootstrap/Modal";
import React from "react";

export default class Modal extends React.Component {
  render() {
    let buttons = this.props.footer;
    if (Array.isArray(buttons)) {
      buttons = buttons.map((button) => {
        if (!button.props.onClick) {
          console.log("Return original button");
          return button;
        }
        return React.cloneElement(button, {
          onClick: () => {
            button.props.onClick();
            this.props.onHide();
          },
        });
      });
    }

    return (
      <BootstrapModal
        show={this.props.show}
        onHide={this.props.onHide}
        centered
      >
        <BootstrapModal.Header closeButton>
          <BootstrapModal.Title>{this.props.name}</BootstrapModal.Title>
        </BootstrapModal.Header>
        <BootstrapModal.Body>{this.props.children}</BootstrapModal.Body>
        <BootstrapModal.Footer>{buttons}</BootstrapModal.Footer>
      </BootstrapModal>
    );
  }
}