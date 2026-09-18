import prisma from "../lib/prisma";
import { getCurrentUser } from "./actions";
import { redirect } from "next/navigation";
import Post from "../components/Post";
import Toast from "../components/Toast";
import CreatePostBox from "../components/CreatePostBox";
import StoryTray from "../components/StoryTray";

export default async function Home() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/auth/login');
  }

  let posts: any[] = [];
  let dbError: string | null = null;

  try {
    posts = await prisma.post.findMany({
      where: { archived: false },
      include: {
        author: {
          include: {
            followers: true,
          },
        },
        likes: true,
        reelComments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                handle: true,
                avatarUrl: true,
                color: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
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
            <span className="planet-icon earth">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            </span>
            <span className="planet-copy">
              <span className="planet-name">Earth</span>
              <span className="planet-status">Live now · 104.2 FM</span>
            </span>
          </button>

          <button className="planet-button" data-planet="mars">
            <span className="planet-icon mars">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="11" ry="4" strokeDasharray="3 2"/><circle cx="12" cy="12" r="4"/></svg>
            </span>
            <span className="planet-copy">
              <span className="planet-name">Mars</span>
              <span className="planet-status">Relay sync standby</span>
            </span>
          </button>

          <button className="planet-button" data-planet="moon">
            <span className="planet-icon moon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </span>
            <span className="planet-copy">
              <span className="planet-name">Moon</span>
              <span className="planet-status">Lunar beacon ready</span>
            </span>
          </button>
        </div>
      </aside>

      <section className="feed">

        <StoryTray currentUser={currentUser} />
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
        {/* Multigram Neural Studio (Mars Sphere) */}
        <div className="info-card coming-soon-card">
          <span className="coming-label" style={{ background: 'rgba(237, 118, 86, 0.2)', color: 'var(--mars)', border: '1px solid rgba(237, 118, 86, 0.35)' }}>
            COMING SOON • NEURAL AI
          </span>
          <h2>Multigram Neural Studio</h2>
          <p>
            Automated 60s highlight distillation, neural audio mastering, and instant AI spatial enhancement calibrated for Deep Space transmissions.
          </p>
        </div>

        {/* Volumetric Spatial Reels (Moon Sphere) */}
        <div className="info-card coming-soon-card moon-card">
          <span className="coming-label" style={{ background: 'rgba(197, 160, 89, 0.2)', color: 'var(--earth)', border: '1px solid rgba(197, 160, 89, 0.35)' }}>
            COMING SOON • VOLUMETRIC
          </span>
          <h2>Volumetric Spatial Reels</h2>
          <p>
            Immersive depth parallax reels calibrated for real-time mobile gyroscope motion and spatial ambient projection.
          </p>
        </div>

        {/* Gesture Protocol */}
        <div className="info-card">
          <h2>Gesture protocol</h2>
          <p>
            No buttons needed in Reels mode. Use the direction of your signal:
          </p>

          <div className="instruction">
            <span className="instruction-icon">→</span>
            <span>Swipe right to follow a creator</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">←</span>
            <span>Swipe left to save transmission</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span>Double tap to reveal localized notes</span>
          </div>

          <div className="instruction">
            <span className="instruction-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <span>Long press to pin note at coordinate</span>
          </div>
        </div>
      </aside>
      <Toast />
    </main>
  );
}
