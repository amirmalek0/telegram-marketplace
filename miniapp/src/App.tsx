import { BrowserRouter } from 'react-router-dom'
import { Marketplace } from './app/Marketplace'
import { ContentProvider } from './features/content/ContentProvider'

function App() {
  return (
    <BrowserRouter>
      <ContentProvider>
        <Marketplace />
      </ContentProvider>
    </BrowserRouter>
  )
}

export default App
