"use client";

import { useState, useRef, useEffect } from "react";
import { toggleLike, toggleFollow } from "../app/actions";
import { showToast } from "./Toast";

export default function Post({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const initialLiked = currentUserId && post.likes ? post.likes.some((l: any) => l.userId === currentUserId) : false;
  const initialFollowing = currentUserId && post.author?.followers ? post.author.followers.some((f: any) => f.followerId === currentUserId) : false;
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const zoneRef = useRef<HTMLDivElement>(null);

  const handleLike = async (fromSwipe = false) => {
    setIsLiked(!isLiked);
    setLikesCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    if (fromSwipe) showToast(!isLiked ? "Signal liked" : "Like removed");
    await toggleLike(post.id);
  };

  const handleFollow = async (fromSwipe = false) => {
    setIsFollowing(!isFollowing);
    if (fromSwipe)
      showToast(!isFollowing ? "Now following this signal" : "Unfollowed signal");
    await toggleFollow(post.authorId);
  };

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;

    const start = (clientX: number, clientY: number) => {
      startX = clientX;
      startY = clientY;
      currentX = clientX;
      dragging = true;
      zone.style.transition = "none";
    };

    const move = (clientX: number, clientY: number) => {
      if (!dragging) return;
      currentX = clientX;
      const deltaX = currentX - startX;
      const deltaY = clientY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        zone.style.transform = `translateX(${deltaX * 0.12}px) rotate(${
          deltaX * 0.015
        }deg)`;
      }
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      zone.style.transition = "transform 0.25s ease";
      zone.style.transform = "";

      const distance = currentX - startX;

      if (Math.abs(distance) < 75) return;

      setFeedback(distance > 0 ? "→" : "♥");

      const fbElement = zone.querySelector(".gesture-feedback");
      if (fbElement) {
        fbElement.classList.remove("show");
        void (fbElement as HTMLElement).offsetWidth;
        fbElement.classList.add("show");
      }

      if (distance > 0) {
        handleFollow(true);
      } else {
        handleLike(true);
      }
    };

    const onTouchStart = (e: TouchEvent) =>
      start(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const onTouchEnd = () => end();

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      zone.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      move(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      end();
    };

    zone.addEventListener("touchstart", onTouchStart, { passive: true });
    zone.addEventListener("touchmove", onTouchMove, { passive: true });
    zone.addEventListener("touchend", onTouchEnd, { passive: true });
    zone.addEventListener("pointerdown", onPointerDown);
    zone.addEventListener("pointermove", onPointerMove);
    zone.addEventListener("pointerup", onPointerUp);
    zone.addEventListener("pointercancel", end);

    return () => {
      zone.removeEventListener("touchstart", onTouchStart);
      zone.removeEventListener("touchmove", onTouchMove);
      zone.removeEventListener("touchend", onTouchEnd);
      zone.removeEventListener("pointerdown", onPointerDown);
      zone.removeEventListener("pointermove", onPointerMove);
      zone.removeEventListener("pointerup", onPointerUp);
      zone.removeEventListener("pointercancel", end);
    };
  }, [isLiked, isFollowing]);

  return (
    <article className="post" data-post-id={post.id}>
      <div className="post-header">
        <div className="user">
          <div className={`user-avatar ${post.author.color}`}>
            {post.author.avatarUrl}
          </div>
          <div className="user-details">
            <span className="username">{post.author.handle}</span>
            <span className="location">{post.author.location}</span>
          </div>
        </div>
        <button className="more-button" aria-label="More options">
          •••
        </button>
      </div>

      <div
        ref={zoneRef}
        className={`post-media ${post.mediaType}`}
        data-swipe-zone
      >
        <span className="media-label">
          Transmission {post.id.substring(post.id.length - 3)}
        </span>
        <div className={`gesture-feedback ${feedback ? "show" : ""}`}>
          {feedback}
        </div>
      </div>

      <div className="post-actions">
        <button
          className={`action-button like-button ${isLiked ? "liked" : ""}`}
          onClick={() => handleLike(false)}
        >
          <span className="action-icon">{isLiked ? "♥" : "♡"}</span>
          <span>Like</span>
        </button>

        <button
          className={`action-button follow-button ${
            isFollowing ? "following" : ""
          }`}
          onClick={() => handleFollow(false)}
        >
          <span className="action-icon">{isFollowing ? "✓" : "＋"}</span>
          <span>{isFollowing ? "Following" : "Follow"}</span>
        </button>

        <button className="action-button">
          <span>◌</span>
          <span>Comment</span>
        </button>

        <button className="action-button" style={{ marginLeft: "auto" }}>
          <span>↗</span>
        </button>
      </div>

      <div className="post-content">
        <div className="post-likes">
          <span className="likes-count">{likesCount.toLocaleString()}</span>{" "}
          likes
        </div>
        <p className="caption">
          <strong>{post.author.handle}</strong> {post.content}
        </p>
        <button className="comments">View all comments</button>
      </div>
    </article>
  );
}
