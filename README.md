# SkillQuest 🎯

A full-stack web application built with React (Vite) for the frontend and Node.js/Express for the backend, using MySQL as the database.

## 📁 Project Structure

```
SkillQuest/
├── backend/              # Node.js/Express server
│   ├── config/           # Database configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Authentication middleware
│   ├── routes/           # API routes
│   ├── server.js         # Entry point
│   ├── package.json
│   └── .env              # Environment variables (not in repo)
│
└── frontend/             # React + Vite app
    ├── src/
    │   ├── pages/        # Page components
    │   ├── services/     # API service functions
    │   ├── styles/       # CSS files
    │   ├── assets/       # Static assets
    │   ├── App.jsx       # Main app component
    │   └── main.jsx      # Entry point
    ├── package.json
    └── vite.config.js
```

## 🚀 Prerequisites

Before running the project, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MySQL** database (or access to a MySQL server)

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd SkillQuest
```

### 2. Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend` folder with the following variables:
   ```env
   DB_HOST=your_database_host
   DB_USER=your_database_username
   DB_PASSWORD=your_database_password
   DB_NAME=skillquest
   DB_PORT=3306
   JWT_SECRET=your_secret_key_here
   PORT=5000
   ```

4. Start the backend server:
   ```bash
   npm start
   ```
   
   The server will run on `http://localhost:5000`

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The app will open at `http://localhost:5173`

## 🛠️ Available Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm run dev` | Start in development mode |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🔧 Making Changes to the Project

### For Contributors / Friends

1. **Fork the repository** (optional, for external contributors)
   - Click the "Fork" button on GitHub

2. **Clone your fork or the main repo:**
   ```bash
   git clone <repository-url>
   cd SkillQuest
   ```

3. **Create a new branch for your feature:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes** in the appropriate folder:
   - Frontend code → `frontend/src/`
   - Backend code → `backend/`

5. **Test your changes locally:**
   - Make sure both frontend and backend are running
   - Test the feature you added/modified

6. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add: description of your changes"
   ```

7. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request:**
   - Go to the repository on GitHub
   - Click "Compare & pull request"
   - Describe your changes and submit

### Recommended Commit Message Format

- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for updates to existing features
- `Remove:` for removed features
- `Style:` for CSS/styling changes

## 📂 Where to Add New Code

| What you're adding | Where to add it |
|-------------------|-----------------|
| New page | `frontend/src/pages/` |
| New API endpoint | `backend/routes/` and `backend/controllers/` |
| New styles | `frontend/src/styles/` |
| New API service | `frontend/src/services/` |
| Static images | `frontend/src/assets/` |

## 🔐 Environment Variables

The `.env` file contains sensitive information and should **NEVER** be committed to the repository. Each contributor needs to create their own `.env` file with the required variables.

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in `.env` file
   - Or kill the process using that port

2. **Database connection failed**
   - Check your `.env` credentials
   - Ensure MySQL server is running

3. **CORS errors**
   - Make sure frontend is running on `http://localhost:5173`
   - Backend CORS is configured for this origin

## 📝 License

ISC

---

**Happy Coding! 🎉**

If you have any questions, feel free to reach out or open an issue on GitHub.
