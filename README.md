# 🎓 myCampusEvents

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-Framework-black?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
</p>

A web-based **Event Management System** designed to simplify college event organization and student participation. It provides a centralized platform for managing events, blogs, polls, feedback, notifications, and user accounts.

## 🌐 Live Demo

- **Frontend:** https://mycampusevents.onrender.com

## ✨ Features

### 👤 User Features
- User registration with email OTP verification.
- Secure login and authentication.
- Browse and search college events.
- View event details and participate in events.
- Read blogs and stay updated.
- Participate in polls and submit feedback.
- Receive notifications.
- Manage personal profile.

### 🛠️ Admin Features
- Manage events (create, update, delete).
- Manage blogs and polls.
- View and manage user feedback.
- Manage event participation.
- Access administrative features through the admin account.

### ⚡ Other Features
- Real-time updates using Socket.IO.
- Email OTP verification.
- MongoDB database integration.
- Cloudinary image storage.
- Responsive user interface.

## 🧰 Technologies Used

| Category | Technologies |
|---|---|
| Frontend | React.js, CSS, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Real-time Communication | Socket.IO |
| Authentication | JWT, HTTP-only Cookies |
| Email | Nodemailer |
| Image Storage | Cloudinary |
| Deployment | Render |

## 📁 Project Structure

```text
College-Event-Management-System/
│
├── client/              # React frontend
│   ├── src/
│   └── package.json
│
├── server/              # Node.js backend
│   ├── controller/
│   ├── model/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── package.json
│
└── README.md
```

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/aj-irshad/College-Event-Management-System.git
cd College-Event-Management-System
```

### 2. Setup the backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory and configure the required environment variables:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string
JWT_KEY=your_jwt_secret

VITE_URL=http://localhost:5173
BASE_URL=http://localhost:5000
VITE_BASE_URL=http://localhost:5000

NODEMAILER_EMAIL=your_email
NODEMAILER_PASS=your_email_app_password

OTP_ENCRYPTION_KEY=your_base64_encryption_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Add any other environment variables required by your configuration, such as admin, VAPID, or payment settings.

Start the backend:

```bash
node app.js
```

### 3. Setup the frontend

Open another terminal:

```bash
cd client
npm install
```

Create a `.env` file inside the `client` directory:

```env
VITE_BASE_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in your terminal (usually `http://localhost:5173`).

> **Important:** Never upload `.env` files, passwords, API keys, database credentials, or encryption keys to GitHub.

## 📖 How to Use

1. Open the application.
2. Register using your email address.
3. Verify your email using the OTP received.
4. Log in to access the system.
5. Browse events, view details, and participate.
6. Explore blogs, polls, and feedback.
7. Check notifications for updates.
8. Administrators can log in using their admin account to manage the platform.

## ☁️ Deployment

The project uses separate Render services:

- **Frontend:** Render Static Site.
- **Backend:** Render Web Service.
- **Database:** MongoDB Atlas.
- **Image Storage:** Cloudinary.

The frontend communicates with the backend through the configured API URL.

## 🔒 Security Notes

- Authentication uses JWT and HTTP-only cookies.
- OTP verification protects account registration.
- Environment variables are used for sensitive configuration.
- Admin routes require appropriate authorization.

## 🎯 Project Purpose

This project was developed as a **B.Tech Computer Science and Artificial Intelligence college project** to demonstrate full-stack web development, database management, authentication, API development, and real-time communication.

## 👨‍💻 Author

**Irshad**

GitHub: [@aj-irshad](https://github.com/aj-irshad)

---

<p align="center">
  <b>🎓  myCampusEvents</b><br/>
  <i>Making campus event management easier and more organized.</i>
</p>
