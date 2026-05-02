# 🎨 Artory - Local Setup Guide

A full-stack art community platform with a React + Vite frontend and Node.js + Express + MongoDB backend.

---

## 📋 Prerequisites

Before you begin, make sure you have the following installed on your machine:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **npm** (comes with Node.js)
3. **MongoDB** (local instance) - [Download](https://www.mongodb.com/try/download/community)

### Verify installations:
```powershell
node --version
npm --version
mongod --version
```

---

## ⚙️ Step 1: Clone / Navigate to the Project

```powershell
cd c:/artory1
```

> The project has two main folders:
> - `client/` - React frontend
> - `server/` - Express backend

---

## ⚙️ Step 2: Install Server Dependencies

```powershell
Set-Location -Path "c:/artory1/server"
npm install
```

---

## ⚙️ Step 3: Install Client Dependencies

```powershell
Set-Location -Path "c:/artory1/client"
npm install
```

---

## ⚙️ Step 4: Configure Environment Variables

Create a `.env` file inside the `server/` folder.

**Path:** `c:/artory1/server/.env`

**Contents:**
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/artory
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:5173
```

> **Note:** You can change `JWT_SECRET` to any random string. It is used for signing authentication tokens.

---

## ⚙️ Step 5: Start MongoDB

Make sure your local MongoDB server is running.

**If MongoDB is installed as a Windows Service:**
```powershell
net start MongoDB
```

**If you need to start MongoDB manually:**
```powershell
mongod
```

> By default, MongoDB runs on `mongodb://127.0.0.1:27017`

---

## ⚙️ Step 6: Start the Backend Server

Open a new terminal and run:

```powershell
Set-Location -Path "c:/artory1/server"
npm start
```

**Expected output:**
```
🚀 Server running on port 5000
✅ MongoDB Connected: 127.0.0.1
```

The API is now running at: `http://localhost:5000`

---

## ⚙️ Step 7: Start the Frontend Client

Open another new terminal and run:

```powershell
Set-Location -Path "c:/artory1/client"
npm run dev
```

**Expected output:**
```
VITE v8.0.9  ready in X ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🌐 Open the App

Visit the following URL in your browser:

```
http://localhost:5173
```

---

## 📁 Project Structure

```
artory/
├── client/              # React + Vite Frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service calls
│   │   └── context/     # React contexts
│   └── package.json
├── server/              # Node.js + Express Backend
│   ├── controllers/     # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & upload middleware
│   ├── config/          # DB configuration
│   └── package.json
└── README.md
```

---

## 🔧 Common Issues

### Port already in use
If port `5000` is already in use, change the `PORT` value in `server/.env`.

### MongoDB connection failed
- Make sure MongoDB is running: `net start MongoDB`
- Check your `MONGO_URI` in the `.env` file

### Client can't reach the server
- Ensure the server is running on port `5000`
- Check that `CLIENT_URL` in `server/.env` matches the client URL

---

## 📦 Additional Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` (client) | Start Vite dev server |
| `npm run build` (client) | Build for production |
| `npm start` (server) | Start production server |
| `npm run dev` (server) | Start with nodemon (auto-restart) |

---

## ✅ Summary of Commands

```powershell
# Terminal 1 - Start MongoDB (if not a service)
mongod

# Terminal 2 - Start Backend
Set-Location -Path "c:/artory1/server"
npm start

# Terminal 3 - Start Frontend
Set-Location -Path "c:/artory1/client"
npm run dev
```

Then open: `http://localhost:5173` 🎉

