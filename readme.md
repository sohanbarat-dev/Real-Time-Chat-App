# ⬡ Relay — Real-time Chat App

A real-time chat application built with **Node.js**, **Socket.io**, and **MongoDB**.

## Features

- 🔴 Real-time messaging via WebSockets (Socket.io)
- 🗄️ Message persistence with MongoDB
- 🏠 Multiple rooms: `#general`, `#tech`, `#random`, `#design`
- 👤 Usernames + color avatars (no account needed)
- ⌨️ Live typing indicators
- 📜 Last 50 messages loaded on join
- 🟢 Live connection status indicator

## Tech Stack

| Layer    | Tech              |
|----------|-------------------|
| Server   | Node.js + Express |
| Realtime | Socket.io         |
| Database | MongoDB + Mongoose|
| Frontend | HTML + CSS + Vanilla JS |

## Project Structure

```
chat-app/
├── server/
│   ├── index.js          # Express + Socket.io server
│   └── models/
│       └── Message.js    # Mongoose schema
├── public/
│   ├── index.html        # Single-page UI
│   ├── css/style.css     # Styles
│   └── js/app.js         # Socket.io client logic
├── .env.example          # Environment variable template
└── package.json
```

## Setup & Run

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatapp
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chatapp
```

### 4. Start the server
```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

### 5. Open in browser
```
http://localhost:3000
```

Open multiple tabs to test real-time messaging!

## API Endpoints

| Method | Route                     | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/messages/:room`     | Get last 50 messages     |

## Socket Events

| Event            | Direction       | Payload                        |
|------------------|-----------------|--------------------------------|
| `join`           | Client → Server | `{ username, room, avatar }`   |
| `send_message`   | Client → Server | `{ text }`                     |
| `typing`         | Client → Server | `{ isTyping }`                 |
| `receive_message`| Server → Client | `{ username, text, avatar, createdAt }` |
| `history`        | Server → Client | `Message[]`                    |
| `user_joined`    | Server → Client | `{ username, users }`          |
| `user_left`      | Server → Client | `{ username, users }`          |
| `system_message` | Server → Client | `{ text }`                     |
| `typing`         | Server → Client | `{ username, isTyping }`       |
