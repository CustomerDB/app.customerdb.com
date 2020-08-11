import React, { useState } from "react";

import Shell from "./Shell.js";
import List from "./List.js";
import Scrollable from "./Scrollable.js";
import Infinite from "./Infinite.js";

export default function Example2(props) {
  const [items, setItems] = useState([]);

  const refine = () => {
    let newItems = items.slice();
    for (let i = 0; i < 25; i++) {
      newItems.push(<List.Item name={`Item ${newItems.length}`} />);
    }
    setItems(newItems);
  };

  return (
    <Shell>
      <List>
        <List.Items>
          <Scrollable>
            <Infinite hasMore={true} onLoad={refine}>
              {items}
            </Infinite>
          </Scrollable>
        </List.Items>
      </List>
    </Shell>
  );
}
