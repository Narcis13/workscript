import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from './components/Home'
import { Advanced } from './components/Advanced'
import { WebSocketWorkflowDemo } from './components/WebSocketWorkflowDemo'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/advanced" element={<Advanced />} />
        <Route path="/websocket" element={<WebSocketWorkflowDemo />} />
      </Routes>
    </Router>
  )
}

export default App
