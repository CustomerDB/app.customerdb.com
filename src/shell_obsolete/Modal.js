// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
