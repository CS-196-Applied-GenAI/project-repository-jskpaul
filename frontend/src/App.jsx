import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Register from './pages/Register'
import Login from './pages/Login'
import Home from './pages/Home'
import Post from './pages/Post'
import ReplyPost from './pages/ReplyPost'
import Replies from './pages/Replies'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="post" element={<Post />} />
        <Route path="tweets/:tweetId/reply" element={<ReplyPost />} />
        <Route path="tweets/:tweetId/replies" element={<Replies />} />
        <Route path="users/:username" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
