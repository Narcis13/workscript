import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from './components/Home'
import { Advanced } from './components/Advanced'
import { WebSocketWorkflowDemo } from './components/WebSocketWorkflowDemo'
import { AiZoca } from './components/AiZoca'
import { NodesManager } from './components/NodesManager'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/advanced" element={<Advanced />} />
        <Route path="/websocket" element={<WebSocketWorkflowDemo />} />
        <Route path="/aizoca" element={<AiZoca />} />
        <Route path="/nodes-browser" element={<NodesManager />} />
      </Routes>
    </Router>
  )
}

export default App
