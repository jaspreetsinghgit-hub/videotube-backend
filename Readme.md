# MyTube Backend

A YouTube-inspired backend REST API built with **Node.js, Express.js, MongoDB and Mongoose**.

This project was built to practice backend development concepts such as REST APIs, authentication, database relationships, file uploads, middleware, MongoDB aggregation, pagination and API architecture.

---

## 🚀 Features

### Authentication & Users
- User registration and login
- JWT-based authentication
- Access and refresh tokens
- Protected routes using authentication middleware
- User profile management
- Avatar and cover image uploads

### Videos
- Publish/upload videos
- Retrieve videos
- Retrieve a video by ID
- Update video details
- Delete videos
- Video views
- Video ownership
- Pagination and filtering
- Sorting and searching

### Comments
- Add comments to videos
- Retrieve video comments
- Update comments
- Delete comments

### Likes
- Like videos
- Remove likes
- Track likes associated with users and videos

### Playlists
- Create playlists
- Manage playlist videos
- Retrieve playlists

### Subscriptions
- Subscribe/unsubscribe to channels
- Retrieve subscription-related information

### Tweets
- Create tweets
- Retrieve tweets
- Update tweets
- Delete tweets

### Dashboard
- Retrieve channel/dashboard-related information

### Media Uploads
- Handles multipart/form-data using Multer
- Temporary file handling
- Media storage using Cloudinary

### API Architecture
- Express.js routing
- Controllers for business logic
- Mongoose models
- Authentication middleware
- Centralized error handling
- Standardized API responses
- MongoDB aggregation pipelines
- Pagination and query-based filtering

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend/API framework |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| JWT | Authentication |
| Cloudinary | Media storage |
| Multer | File uploads |
| bcrypt | Password hashing |
| Postman | API testing |

---

## 📁 Project Structure

```text
src/
│
├── controllers/       # Request handling and business logic
│
├── db/                # Database connection
│
├── middleware/        # Authentication and file-upload middleware
│
├── models/            # Mongoose database models
│
├── routes/            # API route definitions
│
├── utilities/         # Error handling, responses and Cloudinary
│
├── app.js             # Express application configuration
└── index.js           # Application entry point
```

### Architecture Flow

```text
Client
  │
  ▼
Routes
  │
  ▼
Middleware
  │
  ▼
Controllers
  │
  ▼
Models / Mongoose
  │
  ▼
MongoDB
```

For media uploads:

```text
Client
  │
  ▼
Multer
  │
  ▼
Temporary Storage
  │
  ▼
Cloudinary
  │
  ▼
Media URL
```

---

## 🔐 Environment Variables

The project uses environment variables for sensitive configuration such as database credentials, JWT secrets and Cloudinary credentials.

Create a `.env` file in the project root and configure the required variables.

A sample configuration is available in:

```text
.env.sample
```
---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
```

### 2. Navigate to the project

```bash
cd <project-folder>
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file and add the required configuration based on `.env.sample`.

### 5. Start the server

```bash
npm start
```

The server runs locally on the configured port.

---

## 🧪 API Testing

The API was tested during development using **Postman**.

The project includes endpoints covering:

- Authentication
- Users
- Videos
- Comments
- Likes
- Playlists
- Subscriptions
- Tweets
- Dashboard
- Health check

---

## 🧠 What I Learned

Through this project I practiced:

- Building REST APIs with Express.js
- Structuring a Node.js backend
- Working with MongoDB and Mongoose
- Designing Mongoose schemas and relationships
- JWT-based authentication
- Authentication middleware
- Password hashing
- File uploads with Multer
- Cloudinary integration
- MongoDB aggregation pipelines
- Pagination, filtering and sorting
- Error handling
- API response standardization
- Testing APIs with Postman
- Managing environment variables and sensitive configuration

---

## 📌 Project Status

This is a **backend learning and portfolio project** built to practice and demonstrate backend development concepts.

The project is currently focused on the backend API and is not deployed as a public production service.

---

## 🔮 Future Improvements

Possible future improvements include:

- Automated unit and integration testing
- API documentation
- More comprehensive validation
- Additional security improvements
- Deployment and production configuration
- Connecting the API with a frontend application

