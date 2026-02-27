import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AccountCreatePage } from "./pages/AccountCreatePage";
import { LoginPage } from "./pages/LoginPage";
import { HomeFeedPage } from "./pages/HomeFeedPage";
import { NewPostPage } from "./pages/NewPostPage";
import { ReplyPostPage } from "./pages/ReplyPostPage";
import { RepliesPage } from "./pages/RepliesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RequireAuth } from "./auth/RequireAuth";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/register" element={<AccountCreatePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomeFeedPage />
            </RequireAuth>
          }
        />
        <Route
          path="/post"
          element={
            <RequireAuth>
              <NewPostPage />
            </RequireAuth>
          }
        />
        <Route
          path="/post/:tweetId/reply"
          element={
            <RequireAuth>
              <ReplyPostPage />
            </RequireAuth>
          }
        />
        <Route
          path="/tweet/:tweetId/replies"
          element={
            <RequireAuth>
              <RepliesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/:handle"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
