import React from 'react';

import illustration from './assets/images/404.svg';

export default function Error404(props) {
    return <div style={{padding: "3rem"}}>
        <h1>Whoops! This was not suppose to happen</h1>
        <h3>Click <a href="/">here</a> to get back to safety</h3>
        <img src={illustration} alt="404 illustration" style={{width: "50rem"}}/>
    </div>
}