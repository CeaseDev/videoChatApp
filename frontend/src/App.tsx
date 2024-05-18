
import './App.css'
import {BrowserRouter , Route , Routes } from "react-router-dom"
import CreateRoom from './components/CreateRoom'
import Room from './components/Room'

function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom/>} />
        <Route path="/room/:roomID" element={<Room></Room>}/> 
     </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
