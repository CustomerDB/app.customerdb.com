import React from "react";

import Hit from "./Hit.js";
import Moment from "react-moment";
import Typography from "@material-ui/core/Typography";
import { insertTheme } from "./embed/insert.js";

export default function QuoteHit({ hit, reactQuillRef }) {
  let creationTimestamp = new Date(hit.creationTimestamp * 1000);

  const onDrop = (editor, insertIndex) => {
    insertTheme(editor, hit.boardID, hit.objectID, insertIndex);
  };

  return (
    <Hit reactQuillRef={reactQuillRef} onDrop={onDrop}>
      <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
        {hit.name}
      </Typography>
      <div>
        <Typography variant="h6" gutterBottom style={{ fontStyle: "italic" }}>
          {hit.cardIDs && `${hit.cardIDs.length} quotes`}
        </Typography>
        <p style={{ display: "inline" }}>
          {hit.boardName} <Moment fromNow date={creationTimestamp} />
        </p>
      </div>

      <div style={{ margin: "0.5rem" }}>
        {hit.description && (
          <Typography variant="body2" color="textSecondary" component="p">
            {hit.description}
          </Typography>
        )}
      </div>
    </Hit>
  );
}
