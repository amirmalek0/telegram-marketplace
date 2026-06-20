import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Dashboard() {
  return <div>Admin Dashboard</div>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
