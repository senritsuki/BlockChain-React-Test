import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import * as MyChain from './my-chain/my-chain';
import './index.css';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(
  <App />,
  document.getElementById('root') as HTMLElement
);
ReactDOM.render(
  <MyChain.Component />,
  document.getElementById('MyChain') as HTMLElement
);
registerServiceWorker();
