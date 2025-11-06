import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
import { Advanced } from './components/Advanced';
import { WebSocketWorkflowDemo } from './components/WebSocketWorkflowDemo';
import { AiZoca } from './components/AiZoca';
import { NodesManager } from './components/NodesManager';
function App() {
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/advanced", element: _jsx(Advanced, {}) }), _jsx(Route, { path: "/websocket", element: _jsx(WebSocketWorkflowDemo, {}) }), _jsx(Route, { path: "/aizoca", element: _jsx(AiZoca, {}) }), _jsx(Route, { path: "/nodes-browser", element: _jsx(NodesManager, {}) })] }) }));
}
export default App;
