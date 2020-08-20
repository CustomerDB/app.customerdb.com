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
