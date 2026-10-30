import { Search, Bell, Zap, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification.js";

import "../styles/header.css";

const getNotificationPath = (item, user) => {
  switch (item.type) {
    case "event":
      if (!item.linkId) return "/upcoming-events";
      return user?.role === "admin"
        ? `/edit-event/${item.linkId}`
        : `/participate/${item.linkId}`;
    case "blog":
      return item.linkId ? `/blogs/${item.linkId}` : "/blogs";
    case "poll":
      return "/polls";
    case "feedback":
      return "/feedback";
    default:
      return "/";
  }
};

const Header = ({ user, onToggleMenu, isMobileMenuOpen }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState("loading");
  const notificationRef = useRef(null);

  useEffect(() => {
    const getNotifications = async () => {
      setNotificationStatus("loading");
      try {
        const data = await fetchNotifications();
        setNotifications(Array.isArray(data) ? data : []);
        setNotificationStatus("ready");
      } catch (error) {
        console.error("Failed to load notifications", error);
        setNotifications([]);
        setNotificationStatus("error");
      }
    };
    getNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    if (unreadCount === 0) return;
    try {
      await markNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)),
      );
      try {
        await markNotificationAsRead(item._id);
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }

    setShowNotifications(false);
    navigate(getNotificationPath(item, user));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const timeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
  };

  return (
    <header className="header">
      <div className="headerLeft">
        <button
          type="button"
          className="menuToggleBtn"
          onClick={onToggleMenu}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <form className="searchBar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search events or blogs"
            className="searchInput"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search events or blogs"
          />
          <button type="submit" className="searchBtn" aria-label="Search">
            <Search size={19} />
          </button>
        </form>
      </div>

      <div className="headerRight">
        <div className="notificationWrapper" ref={notificationRef}>
          <button
            type="button"
            className="bellBtn"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={showNotifications}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notificationBadge">{badgeLabel}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notificationDropdown" role="region" aria-label="Notification list">
              <div className="notificationHeader">
                <div className="notificationTitleArea">
                  <h3>Notifications</h3>
                  <span className="notificationCountBadge">
                    {unreadCount} new
                  </span>
                </div>
                <button
                  type="button"
                  className="markAsReadBtn"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
              </div>

              <div className="notificationList">
                {notificationStatus === "loading" && (
                  <p className="noNotifications">Loading notifications...</p>
                )}
                {notificationStatus === "error" && (
                  <p className="noNotifications notificationError">
                    Could not load notifications. Please try again later.
                  </p>
                )}
                {notificationStatus === "ready" &&
                  notifications.length === 0 && (
                    <p className="noNotifications">
                      No notifications in the last 5 days.
                    </p>
                  )}
                {notificationStatus === "ready" &&
                  notifications.map((item) => (
                    <button
                      type="button"
                      key={item._id}
                      className={`notificationItem ${!item.read ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div
                        className={`notificationItemIcon ${item.read ? "muted" : ""}`}
                      >
                        <Zap size={16} />
                      </div>
                      <div className="notificationItemContent">
                        <div className="notificationItemTop">
                          <h4>{item.title}</h4>
                          <span>{timeAgo(item.createdAt)}</span>
                        </div>
                        <p>{item.message}</p>
                      </div>
                    </button>
                  ))}
              </div>

              <div className="notificationFooter">
                <button
                  type="button"
                  className="closeNotificationBtn"
                  onClick={() => setShowNotifications(false)}
                >
                  Close Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <section className="userProfile">
          <img
            src={`${import.meta.env.VITE_BASE_URL}/uploads/user/${user.profileImage}`}
            alt={`${user.name}'s profile`}
            className="userImage"
          />
          <article className="profileInfo">
            <p className="userName">Hi, {user.name}</p>
            <p className="department">{user.department}</p>
          </article>
        </section>
      </div>
    </header>
  );
};

export default Header;
