import prisma from "../lib/prisma";
import { getCurrentUser } from "./actions";
import Post from "../components/Post";
import Toast from "../components/Toast";
import CreatePostBox from "../components/CreatePostBox";

export default async function Home() {
  const currentUser = await getCurrentUser();

  let posts: any[] = [];
  let dbError: string | null = null;

  try {
    posts = await prisma.post.findMany({
      include: {
        author: {
          include: {
            followers: true,
          },
        },
        likes: true,
        reelComments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Content Suggestion Algorithm:
    // score = (likes * 2 + comments * 3) * (isFollowed ? 1.5 : 1.0) + recencyBoost
    const now = Date.now();
    posts.sort((a, b) => {
      const ageHoursA = Math.max(0, (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60));
      const ageHoursB = Math.max(0, (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60));

      const isFollowedA = currentUser && a.author?.followers?.some((f: any) => f.followerId === currentUser.id);
      const isFollowedB = currentUser && b.author?.followers?.some((f: any) => f.followerId === currentUser.id);

      const baseScoreA = ((a.likes?.length || 0) * 2 + (a.reelComments?.length || 0) * 3) * (isFollowedA ? 1.5 : 1.0);
      const baseScoreB = ((b.likes?.length || 0) * 2 + (b.reelComments?.length || 0) * 3) * (isFollowedB ? 1.5 : 1.0);

      const recencyBoostA = Math.max(0, 48 - ageHoursA) * 0.5;
      const recencyBoostB = Math.max(0, 48 - ageHoursB) * 0.5;

      const totalScoreA = baseScoreA + recencyBoostA;
      const totalScoreB = baseScoreB + recencyBoostB;

      return totalScoreB - totalScoreA;
    });

  } catch (err: any) {
    console.error("Failed to load transmissions:", err);
    dbError = err.message || "Failed to connect to CockroachDB";
  }

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
            <div className="eyebrow">Upabode Network • Solar Feed</div>
            <h1>Signals from home.</h1>
            <p className="feed-subtitle">
              Share moments, carousels, and cosmic field notes across planetary horizons.
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

        {dbError && (
          <div style={{
            padding: '20px',
            background: 'rgba(237, 118, 86, 0.1)',
            border: '1px solid var(--mars)',
            borderRadius: '18px',
            marginBottom: '20px',
            color: '#f8d7da'
          }}>
            <h3 style={{ color: 'var(--mars)', fontSize: '1rem', marginBottom: '6px' }}>
              📡 CockroachDB Connection Notice
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '8px' }}>
              The database connection is initializing.
            </p>
          </div>
        )}

        {posts.map((post) => (
          <Post key={post.id} post={post} currentUserId={currentUser?.id} />
        ))}
      </section>

      <aside className="right-panel">
        <div className="info-card">
          <h2>Gesture protocol</h2>
          <p>
            No buttons needed in Reels mode. Use the direction of your signal:
          </p>

          <div className="instruction">
            <span className="instruction-icon">→</span>
            <span>Swipe right to follow an astronaut</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">←</span>
            <span>Swipe left to save transmission</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">💬</span>
            <span>Double tap to reveal localized notes</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">📍</span>
            <span>Long press to pin note at coordinate</span>
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
