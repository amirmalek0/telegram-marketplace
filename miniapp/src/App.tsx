import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Home() {
  return <div>Home Page</div>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
