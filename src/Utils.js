import React from 'react';

import Spinner from 'react-bootstrap/Spinner';

export function now() {
    let now = new Date();
    return now.toISOString();
}

export function Loading() {
    return  <div className="outerContainer"><div className="spinnerContainer"><Spinner animation="grow" /></div></div>;
}
