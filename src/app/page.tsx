import prisma from "../lib/prisma";
import { getCurrentUser } from "./actions";
import Post from "../components/Post";
import Toast from "../components/Toast";
import CreatePostBox from "../components/CreatePostBox";

export default async function Home() {
  const currentUser = await getCurrentUser();

  const posts = await prisma.post.findMany({
    include: {
      author: true,
      likes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="content">
      <aside className="sidebar">
        <div className="sidebar-heading">Communication zones</div>

        <div className="planet-list">
          <button className="planet-button active" data-planet="earth">
            <span className="planet-icon earth">🌍</span>
            <span className="planet-copy">
              <span className="planet-name">Earth</span>
              <span className="planet-status">Live now · 104.2 FM</span>
            </span>
          </button>

          <button className="planet-button" data-planet="mars">
            <span className="planet-icon mars">◉</span>
            <span className="planet-copy">
              <span className="planet-name">Mars</span>
              <span className="planet-status">Relay sync standby</span>
            </span>
          </button>

          <button className="planet-button" data-planet="moon">
            <span className="planet-icon moon">◐</span>
            <span className="planet-copy">
              <span className="planet-name">Moon</span>
              <span className="planet-status">Lunar beacon ready</span>
            </span>
          </button>
        </div>
      </aside>

      <section className="feed">
        <div className="feed-header">
          <div>
            <div className="eyebrow">Earth sector • Solar net</div>
            <h1>Signals from home.</h1>
            <p className="feed-subtitle">
              Share moments, ideas, and cosmic field notes across planetary horizons.
            </p>
          </div>

          <div className="feed-count">{posts.length} transmissions</div>
        </div>

        <div className="stories">
          <div className="story">
            <div className="story-ring">
              <div className="story-inner">＋</div>
            </div>
            <span>Your signal</span>
          </div>

          <div className="story">
            <div className="story-ring">
              <div className="story-inner">🌌</div>
            </div>
            <span>Deep space</span>
          </div>

          <div className="story">
            <div className="story-ring">
              <div className="story-inner">🌱</div>
            </div>
            <span>Greenhouse</span>
          </div>

          <div className="story">
            <div className="story-ring">
              <div className="story-inner">🔭</div>
            </div>
            <span>Observers</span>
          </div>

          <div className="story">
            <div className="story-ring">
              <div className="story-inner">🛰️</div>
            </div>
            <span>Orbit lab</span>
          </div>
        </div>

        {/* Live Signal Broadcast Box */}
        <CreatePostBox currentUser={currentUser} />

        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}
      </section>

      <aside className="right-panel">
        <div className="info-card">
          <h2>Gesture protocol</h2>
          <p>
            No tiny buttons needed. Use the direction of your signal to interact
            with the network.
          </p>

          <div className="instruction">
            <span className="instruction-icon">→</span>
            <span>Swipe right to follow a signal</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">←</span>
            <span>Swipe left to like a signal</span>
          </div>
        </div>

        <div className="info-card coming-soon-card">
          <span className="coming-label">Orbital Relay</span>
          <h2>Mars Channel</h2>
          <p>The first red planet transmissions are synchronizing across Deep Space Network relay nodes.</p>
        </div>

        <div className="info-card coming-soon-card moon-card">
          <span className="coming-label">Lagrange Point 1</span>
          <h2>Moon Channel</h2>
          <p>Sub-second lunar relay stations calibrated and receiving ambient transmissions.</p>
        </div>
      </aside>
      <Toast />
    </main>
  );
}
