import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  addDoc,
  deleteDoc,
  query,
  onSnapshot,
  serverTimestamp,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  writeBatch,
  where,
  getDocs,
  limit,
} from "firebase/firestore";

import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import "./Chats.style.css";

import {
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserDeleteOutlined,
} from "@ant-design/icons";

import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageSeparator,
  MessageInput,
  Sidebar,
  ConversationList,
  Conversation,
  Avatar,
} from "@chatscope/chat-ui-kit-react";

// styles imported once above
import { useAuth } from "../context/AuthContext";

function Chats() {
  const { user, signOut } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(() => {
    try {
      return localStorage.getItem("selectedChatId");
    } catch {
      return null;
    }
  });
  const [selectedChat, setSelectedChat] = useState(null);
  const [members, setMembers] = useState([]);

  const [messages, setMessages] = useState([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberAddStatus, setMemberAddStatus] = useState("");
  const [reactionPickerFor, setReactionPickerFor] = useState(null);

  const fmtDateTime = (ts) => {
    if (!ts?.toDate) return "";
    try {
      return ts.toDate().toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const fmtDateOnly = (ts) => {
    if (!ts?.toDate) return "";
    try {
      return ts.toDate().toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const fmtTimeOnly = (ts) => {
    if (!ts?.toDate) return "";
    try {
      return ts.toDate().toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const dayKey = (ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const reactionDefs = useMemo(
    () => [
      { key: "like", emoji: "👍", label: "Like" },
      { key: "love", emoji: "❤️", label: "Love" },
      { key: "laugh", emoji: "😂", label: "Haha" },
      { key: "wow", emoji: "😮", label: "Wow" },
      { key: "sad", emoji: "😢", label: "Sad" },
      { key: "angry", emoji: "😡", label: "Angry" },
    ],
    []
  );

  useEffect(() => {
    try {
      if (selectedChatId) localStorage.setItem("selectedChatId", selectedChatId);
      else localStorage.removeItem("selectedChatId");
    } catch {
      // ignore
    }
  }, [selectedChatId]);

  // Load chats for current user
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("memberUids", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aMs = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
            const bMs = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
            return bMs - aMs;
          });

        setChats(list);
        setSelectedChatId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      },
      (err) => {
        console.error("Failed to load chats:", err);
        setChats([]);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  // Load selected chat doc
  useEffect(() => {
    if (!selectedChatId) {
      setSelectedChat(null);
      setMembers([]);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "chats", selectedChatId), (snap) => {
      setSelectedChat(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    return unsubscribe;
  }, [selectedChatId]);

  // Load member profiles for selected chat
  useEffect(() => {
    const uids = selectedChat?.memberUids ?? [];
    if (!uids.length) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    Promise.all(
      uids.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          return snap.exists() ? { id: snap.id, ...snap.data() } : { uid };
        } catch {
          return { uid };
        }
      })
    ).then((list) => {
      if (!cancelled) setMembers(list);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedChat?.memberUids]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "chats", selectedChatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsubscribe;
  }, [selectedChatId]);

  // 🔹 Send message
  const sendMessage = async (text) => {
    if (!text || text.trim() === "") return;
    if (!selectedChatId) return;

    await addDoc(collection(db, "chats", selectedChatId, "messages"), {
      text,
      uid: user?.uid,
      displayName: user?.displayName || user?.email || "Anonymous",
      photoURL: user?.photoURL || "",
      createdAt: serverTimestamp(),
      reactions: {},
    });

    // keep chat ordering metadata fresh
    updateDoc(doc(db, "chats", selectedChatId), {
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  };

  const toggleReaction = async (messageId, reactionKey) => {
    if (!selectedChatId || !messageId || !reactionKey || !user?.uid) return;
    const msg = messages.find((m) => m.id === messageId);
    const existing = msg?.reactions?.[reactionKey] || [];
    const hasReacted = Array.isArray(existing) && existing.includes(user.uid);

    try {
      await updateDoc(
        doc(db, "chats", selectedChatId, "messages", messageId),
        {
          [`reactions.${reactionKey}`]: hasReacted
            ? arrayRemove(user.uid)
            : arrayUnion(user.uid),
        }
      );
    } catch (e) {
      console.error(e);
      alert(
        e?.code === "permission-denied"
          ? "Permission denied by Firestore rules."
          : "Failed to update reaction. Check console for details."
      );
    }
  };

  const createChat = async () => {
    if (!user?.uid) return;
    const chatName = window.prompt("Chat name (optional):", "New chat");
    const docRef = await addDoc(collection(db, "chats"), {
      name: (chatName || "New chat").trim() || "New chat",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid,
      memberUids: [user.uid],
    });
    setSelectedChatId(docRef.id);
  };

  const deleteChat = async (chatId) => {
    if (!chatId) return;
    const chat = chats.find((c) => c.id === chatId);
    const name = chat?.name || "this chat";

    const ok = window.confirm(`Delete "${name}"? This cannot be undone.`);
    if (!ok) return;

    try {
      // Best-effort cleanup of messages (Firestore doesn't auto-delete subcollections).
      const msgsSnap = await getDocs(
        query(collection(db, "chats", chatId, "messages"), limit(250))
      );
      const batch = writeBatch(db);
      msgsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      await deleteDoc(doc(db, "chats", chatId));

      setSelectedChatId((prev) => (prev === chatId ? null : prev));
    } catch (e) {
      console.error(e);
      alert(
        e?.code === "permission-denied"
          ? "Permission denied by Firestore rules."
          : "Failed to delete chat. Check console for details."
      );
    }
  };

  const removeMember = async (uidToRemove) => {
    if (!selectedChatId || !uidToRemove) return;
    if (selectedChat?.createdBy !== user?.uid) return;

    if (uidToRemove === selectedChat?.createdBy) {
      alert("You can't remove the chat owner.");
      return;
    }

    const member = members.find((m) => (m.uid || m.id) === uidToRemove);
    const label = member?.displayName || member?.email || uidToRemove;
    const ok = window.confirm(`Remove "${label}" from this chat?`);
    if (!ok) return;

    try {
      await updateDoc(doc(db, "chats", selectedChatId), {
        memberUids: arrayRemove(uidToRemove),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert(
        e?.code === "permission-denied"
          ? "Permission denied by Firestore rules."
          : "Failed to remove member. Check console for details."
      );
    }
  };

  const addMemberByEmail = async () => {
    setMemberAddStatus("");
    const email = memberEmail.trim().toLowerCase();
    if (!email || !selectedChatId) return;

    if (email === (user?.email || "").toLowerCase()) {
      setMemberAddStatus("You are already in this chat.");
      return;
    }

    try {
      setMemberAddStatus("Searching user…");
      const q = query(
        collection(db, "users"),
        where("email", "==", email),
        limit(1)
      );
      const res = await getDocs(q);
      const userDoc = res.docs[0];
      if (!userDoc) {
        setMemberAddStatus(
          "No user found with that email (they must sign in once)."
        );
        return;
      }

      const uidToAdd = userDoc.id; // users/{uid}
      setMemberAddStatus("Adding member…");
      await updateDoc(doc(db, "chats", selectedChatId), {
        memberUids: arrayUnion(uidToAdd),
        updatedAt: serverTimestamp(),
      });

      setMemberEmail("");
      setMemberAddStatus("Member added.");
    } catch (e) {
      console.error(e);
      const msg =
        e?.code === "permission-denied"
          ? "Permission denied by Firestore rules (need rules update)."
          : "Failed to add member. Check console for details.";
      setMemberAddStatus(msg);
    }
  };

  const meLabel = useMemo(
    () => user?.displayName || user?.email || "Me",
    [user]
  );

  const selectedChatName = selectedChat?.name || "Select a chat";
  const selectedChatCreatedAtLabel = fmtDateTime(selectedChat?.createdAt);

  return (
    <div className="chats-root">
      <MainContainer>
        {/* Sidebar (optional, for future users list) */}
        <Sidebar position="left">
          <div className="panel-header">
            <div className="panel-title">Chats</div>
            <button className="btn btn-primary" onClick={createChat}>
              <PlusOutlined /> New
            </button>
          </div>

          <ConversationList>
            {chats.map((c) => (
              <div
                key={c.id}
                className={
                  "chat-row" + (c.id === selectedChatId ? " chat-row--active" : "")
                }
                onClick={() => setSelectedChatId(c.id)}
                title={
                  c.createdAt
                    ? `Created: ${fmtDateTime(c.createdAt)}`
                    : "Created: (pending)"
                }
              >
                <div className="chat-row__content">
                  <Conversation
                    name={c.name || "Chat"}
                    info={(c.memberUids?.length || 1) + " members"}
                    active={c.id === selectedChatId}
                  />
                </div>
                {c.createdBy === user?.uid && (
                  <button
                    className="icon-btn icon-btn--danger"
                    title="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(c.id);
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                )}
              </div>
            ))}
          </ConversationList>
        </Sidebar>

        {/* Chat area */}
        <ChatContainer>
          <div className="chat-topbar">
            <div className="chat-topbar__left">
              <Avatar
                src={user?.photoURL || undefined}
                name={meLabel}
                status="available"
              />
              <div className="chat-topbar__meta">
                <div className="chat-topbar__name">{meLabel}</div>
                <div className="chat-topbar__sub">
                  {selectedChatId ? selectedChatName : "No chat selected"}
                </div>
              </div>
            </div>
            <div className="chat-topbar__right">
              {selectedChatCreatedAtLabel && (
                <div className="chip" title={`Chat created: ${selectedChatCreatedAtLabel}`}>
                  <ClockCircleOutlined />
                  <span>{selectedChatCreatedAtLabel}</span>
                </div>
              )}
              {selectedChatId && selectedChat?.createdBy === user?.uid && (
                <button
                  className="btn btn-ghost-danger"
                  onClick={() => deleteChat(selectedChatId)}
                >
                  <DeleteOutlined /> Delete
                </button>
              )}
              <button className="btn btn-danger" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>

          {/* Messages */}
          <MessageList>
            {messages.flatMap((msg, i) => {
              const prev = messages[i - 1];
              const prevKey = dayKey(prev?.createdAt);
              const curKey = dayKey(msg?.createdAt);
              const showSeparator = i === 0 || (curKey && curKey !== prevKey);

              const nodes = [];
              if (showSeparator) {
                nodes.push(
                  <MessageSeparator key={`sep-${msg.id ?? i}`}>
                    {fmtDateOnly(msg.createdAt) || "Today"}
                  </MessageSeparator>
                );
              }

              nodes.push(
                <Message
                  key={msg.id ?? i}
                  avatarSpacer
                  avatarPosition={msg.uid === user?.uid ? "br" : "bl"}
                  model={{
                    message: msg.text,
                    direction: msg.uid === user?.uid ? "outgoing" : "incoming",
                    sender:
                      msg.uid === user?.uid ? "Me" : msg.displayName || "User",
                    position: "single",
                  }}
                >
                  <Avatar
                    src={msg.photoURL || undefined}
                    name={msg.displayName || "User"}
                  />

                  {/* show only time per message; date is in the separator */}
                  <Message.Footer sentTime={fmtTimeOnly(msg.createdAt) || ""} />

                  <div className="message-meta">
                    <div className="reactions-row">
                      {reactionDefs.map((r) => {
                        const uids = msg?.reactions?.[r.key] || [];
                        const count = Array.isArray(uids) ? uids.length : 0;
                        if (!count) return null;
                        const active =
                          Array.isArray(uids) && uids.includes(user?.uid);
                        return (
                          <button
                            key={r.key}
                            className={
                              "reaction-pill" +
                              (active ? " reaction-pill--active" : "")
                            }
                            onClick={() => toggleReaction(msg.id, r.key)}
                            title={r.label}
                          >
                            <span>{r.emoji}</span>
                            <span className="reaction-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="reaction-actions">
                      <button
                        className="reaction-add-btn"
                        onClick={() =>
                          setReactionPickerFor((prev) =>
                            prev === msg.id ? null : msg.id
                          )
                        }
                        title="React"
                      >
                        😊
                      </button>

                      {reactionPickerFor === msg.id && (
                        <div
                          className="reaction-picker"
                          onMouseLeave={() => setReactionPickerFor(null)}
                        >
                          {reactionDefs.map((r) => (
                            <button
                              key={r.key}
                              className="reaction-picker-btn"
                              onClick={() => {
                                toggleReaction(msg.id, r.key);
                                setReactionPickerFor(null);
                              }}
                              title={r.label}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Message>
              );

              return nodes;
            })}
          </MessageList>

          {/* Input */}
          <MessageInput
            placeholder={
              selectedChatId ? `Message #${selectedChatName}` : "Create/select a chat to start"
            }
            attachButton={false}
            onSend={sendMessage}
            disabled={!selectedChatId}
          />
        </ChatContainer>

        {/* Members sidebar */}
        <Sidebar position="right">
          <div className="panel-header">
            <div className="panel-title">{selectedChatName}</div>
            <div className="panel-subtitle">Members</div>
          </div>

          <div className="panel-section">
            <input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="input"
              disabled={!selectedChatId}
            />
            <button
              className="btn btn-primary btn-block"
              onClick={addMemberByEmail}
              disabled={!selectedChatId}
            >
              Add to chat
            </button>
            {memberAddStatus && (
              <div className="helper-text">{memberAddStatus}</div>
            )}
          </div>

          <div className="panel-section panel-section--bordered">
            <div className="members-list">
              {members.map((m) => (
                <div
                  key={m.uid || m.id}
                  className="member-row"
                >
                  <Avatar
                    src={m.photoURL || undefined}
                    name={m.displayName || m.email || "User"}
                    status="available"
                  />
                  <div className="member-meta">
                    <div className="member-name">{m.displayName || "User"}</div>
                    <div className="member-sub">{m.email || m.uid}</div>
                  </div>
                  {selectedChat?.createdBy === user?.uid &&
                    (m.uid || m.id) !== selectedChat?.createdBy && (
                      <button
                        className="icon-btn icon-btn--danger member-remove"
                        title="Remove from chat"
                        onClick={() => removeMember(m.uid || m.id)}
                      >
                        <UserDeleteOutlined />
                      </button>
                    )}
                </div>
              ))}
              {!members.length && (
                <div className="helper-text">No members to show.</div>
              )}
            </div>
          </div>
        </Sidebar>
      </MainContainer>
    </div>
  );
}

export default Chats;
