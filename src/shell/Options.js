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

import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import React from "react";

export default function Options(props) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {props.options.map((option) => {
          return (
            <MenuItem
              key={option.name}
              onClick={() => {
                option.onClick(props.item);
                handleClose();
              }}
            >
              {option.name}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );

  // return (
  //   <Dropdown style={{ width: "2.5rem", marginLeft: "auto" }}>
  //     <Dropdown.Toggle variant="link" className="threedots">
  //       {threedots}
  //     </Dropdown.Toggle>
  //     <Dropdown.Menu>{list}</Dropdown.Menu>
  //   </Dropdown>
  // );
}
